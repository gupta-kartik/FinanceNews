// Open Banking Middleware
const OpenBankingAuth = require('./auth');
const ConsentManager = require('./consent');

// Rate limiting storage
const rateLimitStore = new Map();

// Authentication middleware for TPPs
const authenticateTPP = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Missing or invalid authorization header'
    });
  }

  const token = authHeader.substring(7);
  const verificationResult = OpenBankingAuth.verifyToken(token);

  if (!verificationResult.success) {
    return res.status(401).json({
      error: 'unauthorized', 
      error_description: verificationResult.error
    });
  }

  req.tpp = verificationResult.payload;
  next();
};

// Consent validation middleware
const validateConsent = (requiredPermission) => {
  return (req, res, next) => {
    const consentId = req.headers['x-consent-id'];
    
    if (!consentId) {
      return res.status(400).json({
        error: 'bad_request',
        error_description: 'Missing consent ID in headers'
      });
    }

    const validation = ConsentManager.validateConsent(consentId, requiredPermission);
    
    if (!validation.valid) {
      return res.status(403).json({
        error: 'insufficient_scope',
        error_description: validation.error
      });
    }

    req.consent = validation.consent;
    req.userId = validation.consent.userId;
    next();
  };
};

// Rate limiting middleware
const rateLimit = (requestsPerMinute = 100) => {
  return (req, res, next) => {
    const clientId = req.tpp?.clientId || req.ip;
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    if (!rateLimitStore.has(clientId)) {
      rateLimitStore.set(clientId, []);
    }

    const requests = rateLimitStore.get(clientId);
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (recentRequests.length >= requestsPerMinute) {
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        error_description: 'Too many requests',
        retry_after: 60
      });
    }

    // Add current request
    recentRequests.push(now);
    rateLimitStore.set(clientId, recentRequests);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', requestsPerMinute);
    res.setHeader('X-RateLimit-Remaining', requestsPerMinute - recentRequests.length);
    res.setHeader('X-RateLimit-Reset', Math.ceil((windowStart + 60000) / 1000));

    next();
  };
};

// Audit logging middleware
const auditLog = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    clientId: req.tpp?.clientId,
    userId: req.userId,
    consentId: req.headers['x-consent-id'],
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    requestId: require('uuid').v4()
  };

  // Override res.json to capture response
  const originalJson = res.json;
  res.json = function(data) {
    logEntry.responseTime = Date.now() - startTime;
    logEntry.statusCode = res.statusCode;
    logEntry.success = res.statusCode < 400;
    
    // Log the entry (in production, this would go to a proper logging system)
    console.log('[AUDIT]', JSON.stringify(logEntry));
    
    return originalJson.call(this, data);
  };

  req.audit = logEntry;
  next();
};

// CORS for Open Banking (more restrictive than general CORS)
const openBankingCORS = (req, res, next) => {
  // Only allow specific origins in production
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? ['https://trusted-tpp-domain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Consent-ID, X-Request-ID');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'validation_error',
      error_description: err.message,
      details: err.errors
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Authentication failed'
    });
  }

  return res.status(500).json({
    error: 'internal_server_error',
    error_description: 'An unexpected error occurred',
    request_id: req.audit?.requestId
  });
};

// Request ID middleware
const addRequestId = (req, res, next) => {
  req.requestId = require('uuid').v4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

module.exports = {
  authenticateTPP,
  validateConsent,
  rateLimit,
  auditLog,
  openBankingCORS,
  errorHandler,
  addRequestId
};