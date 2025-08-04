// Open Banking Authentication Module
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'openbanking-demo-secret-key';
const JWT_EXPIRY = '1h';

// Mock TPP (Third Party Provider) registry
const tppRegistry = new Map();
const userSessions = new Map();

// Sample TPPs for demo
const initializeTPPs = () => {
  const sampleTPPs = [
    {
      id: 'tpp_001',
      name: 'Demo Payment App',
      clientId: 'demo_client_001',
      clientSecret: bcrypt.hashSync('demo_secret_001', 10),
      scopes: ['account_info', 'payment_initiation'],
      status: 'active',
      registeredAt: new Date().toISOString()
    },
    {
      id: 'tpp_002', 
      name: 'Finance Manager Pro',
      clientId: 'demo_client_002',
      clientSecret: bcrypt.hashSync('demo_secret_002', 10),
      scopes: ['account_info', 'balance_check'],
      status: 'active',
      registeredAt: new Date().toISOString()
    }
  ];

  sampleTPPs.forEach(tpp => {
    tppRegistry.set(tpp.clientId, tpp);
  });
};

// Initialize sample data
initializeTPPs();

class OpenBankingAuth {
  
  // TPP Authentication
  static async authenticateTPP(clientId, clientSecret) {
    const tpp = tppRegistry.get(clientId);
    
    if (!tpp || tpp.status !== 'active') {
      return { success: false, error: 'Invalid client credentials' };
    }

    const isValidSecret = await bcrypt.compare(clientSecret, tpp.clientSecret);
    if (!isValidSecret) {
      return { success: false, error: 'Invalid client credentials' };
    }

    const token = jwt.sign(
      { 
        clientId: tpp.clientId,
        tppId: tpp.id,
        scopes: tpp.scopes 
      }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRY }
    );

    return { 
      success: true, 
      token,
      tpp: {
        id: tpp.id,
        name: tpp.name,
        scopes: tpp.scopes
      }
    };
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { success: true, payload: decoded };
    } catch (error) {
      return { success: false, error: 'Invalid or expired token' };
    }
  }

  // Register new TPP (simplified for demo)
  static registerTPP(name, scopes = []) {
    const tppId = `tpp_${Date.now()}`;
    const clientId = `client_${Date.now()}`;
    const clientSecret = `secret_${uuidv4()}`;

    const tpp = {
      id: tppId,
      name,
      clientId,
      clientSecret: bcrypt.hashSync(clientSecret, 10),
      scopes,
      status: 'active',
      registeredAt: new Date().toISOString()
    };

    tppRegistry.set(clientId, tpp);

    return {
      success: true,
      tpp: {
        id: tppId,
        name,
        clientId,
        clientSecret, // Return plain text only once for registration
        scopes
      }
    };
  }

  // Get TPP information
  static getTPP(clientId) {
    const tpp = tppRegistry.get(clientId);
    if (!tpp) {
      return { success: false, error: 'TPP not found' };
    }

    return {
      success: true,
      tpp: {
        id: tpp.id,
        name: tpp.name,
        clientId: tpp.clientId,
        scopes: tpp.scopes,
        status: tpp.status,
        registeredAt: tpp.registeredAt
      }
    };
  }

  // List all TPPs (admin function)
  static listTPPs() {
    const tpps = Array.from(tppRegistry.values()).map(tpp => ({
      id: tpp.id,
      name: tpp.name,
      clientId: tpp.clientId,
      scopes: tpp.scopes,
      status: tpp.status,
      registeredAt: tpp.registeredAt
    }));

    return { success: true, tpps };
  }

  // Create user session for consent flow
  static createUserSession(userId, tppId) {
    const sessionId = uuidv4();
    const session = {
      sessionId,
      userId,
      tppId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
    };

    userSessions.set(sessionId, session);
    return { success: true, sessionId };
  }

  // Verify user session
  static verifyUserSession(sessionId) {
    const session = userSessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (new Date() > new Date(session.expiresAt)) {
      userSessions.delete(sessionId);
      return { success: false, error: 'Session expired' };
    }

    return { success: true, session };
  }
}

module.exports = OpenBankingAuth;