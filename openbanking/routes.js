// Open Banking API Routes
const express = require('express');
const OpenBankingAuth = require('./auth');
const ConsentManager = require('./consent');
const FinancialDataService = require('./financial-data');
const { 
  authenticateTPP, 
  validateConsent, 
  rateLimit, 
  auditLog,
  addRequestId
} = require('./middleware');

const router = express.Router();

// Apply common middleware to all open banking routes
router.use(addRequestId);
router.use(auditLog);
router.use(rateLimit(100)); // 100 requests per minute

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// =============================================================================
// TPP MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /openbanking/v1/tpp/auth:
 *   post:
 *     summary: Authenticate TPP and get access token
 *     tags: [TPP Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_id
 *               - client_secret
 *             properties:
 *               client_id:
 *                 type: string
 *               client_secret:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Authentication failed
 */
router.post('/tpp/auth', async (req, res) => {
  try {
    const { client_id, client_secret } = req.body;

    if (!client_id || !client_secret) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing client_id or client_secret'
      });
    }

    const result = await OpenBankingAuth.authenticateTPP(client_id, client_secret);

    if (!result.success) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: result.error
      });
    }

    res.json({
      access_token: result.token,
      token_type: 'bearer',
      expires_in: 3600,
      tpp: result.tpp
    });

  } catch (error) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'Authentication service error'
    });
  }
});

/**
 * @swagger
 * /openbanking/v1/tpp/register:
 *   post:
 *     summary: Register a new TPP
 *     tags: [TPP Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - scopes
 *             properties:
 *               name:
 *                 type: string
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: TPP registered successfully
 *       400:
 *         description: Invalid request
 */
router.post('/tpp/register', (req, res) => {
  try {
    const { name, scopes } = req.body;

    if (!name || !scopes || !Array.isArray(scopes)) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing or invalid name or scopes'
      });
    }

    const result = OpenBankingAuth.registerTPP(name, scopes);
    res.status(201).json(result);

  } catch (error) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'Registration service error'
    });
  }
});

// =============================================================================
// CONSENT MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /openbanking/v1/consent:
 *   post:
 *     summary: Create a new consent request
 *     tags: [Consent Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Consent created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/consent', authenticateTPP, (req, res) => {
  try {
    const { userId, permissions, validityPeriod } = req.body;

    if (!userId || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing userId or permissions'
      });
    }

    const result = ConsentManager.createConsent(
      req.tpp.tppId, 
      userId, 
      permissions, 
      validityPeriod
    );

    res.status(201).json({
      consentId: result.consentId,
      status: 'pending',
      permissions,
      expiresAt: result.consent.expiresAt,
      links: {
        self: `/openbanking/v1/consent/${result.consentId}`,
        grant: `/openbanking/v1/consent/${result.consentId}/grant`
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'Consent service error'
    });
  }
});

/**
 * @swagger
 * /openbanking/v1/consent/{consentId}:
 *   get:
 *     summary: Get consent details
 *     tags: [Consent Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: consentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Consent details
 *       404:
 *         description: Consent not found
 */
router.get('/consent/:consentId', authenticateTPP, (req, res) => {
  try {
    const { consentId } = req.params;
    const result = ConsentManager.getConsent(consentId);

    if (!result.success) {
      return res.status(404).json({
        error: 'not_found',
        error_description: result.error
      });
    }

    res.json({
      consent: result.consent,
      links: {
        self: `/openbanking/v1/consent/${consentId}`,
        history: `/openbanking/v1/consent/${consentId}/history`
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'Consent service error'
    });
  }
});

/**
 * @swagger
 * /openbanking/v1/consent/{consentId}/grant:
 *   post:
 *     summary: Grant or reject consent
 *     tags: [Consent Management]
 *     parameters:
 *       - in: path
 *         name: consentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approved
 *             properties:
 *               approved:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Consent updated
 *       404:
 *         description: Consent not found
 */
router.post('/consent/:consentId/grant', (req, res) => {
  try {
    const { consentId } = req.params;
    const { approved } = req.body;

    if (typeof approved !== 'boolean') {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing or invalid approved field'
      });
    }

    const result = ConsentManager.grantConsent(consentId, approved);

    if (!result.success) {
      return res.status(404).json({
        error: 'not_found',
        error_description: result.error
      });
    }

    res.json({
      consentId,
      status: result.consent.status,
      message: approved ? 'Consent granted' : 'Consent rejected'
    });

  } catch (error) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'Consent service error'
    });
  }
});

// =============================================================================
// ACCOUNT INFORMATION SERVICES (AIS)
// =============================================================================

/**
 * @swagger
 * /openbanking/v1/accounts:
 *   get:
 *     summary: Get user accounts
 *     tags: [Account Information]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-consent-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of accounts
 *       403:
 *         description: Insufficient consent
 */
router.get('/accounts', authenticateTPP, validateConsent('account_info'), (req, res) => {
  try {
    const result = FinancialDataService.getAccounts(req.userId);

    if (!result.success) {
      return res.status(404).json({
        error: 'not_found',
        error_description: result.error
      });
    }

    res.json(result.data);

  } catch (error) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'Account service error'
    });
  }
});

/**
 * @swagger
 * /openbanking/v1/accounts/{accountId}:
 *   get:
 *     summary: Get specific account details
 *     tags: [Account Information]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-consent-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account details
 *       404:
 *         description: Account not found
 */
router.get('/accounts/:accountId', authenticateTPP, validateConsent('account_info'), (req, res) => {
  try {
    const { accountId } = req.params;
    const result = FinancialDataService.getAccount(req.userId, accountId);

    if (!result.success) {
      return res.status(404).json({
        error: 'not_found',
        error_description: result.error
      });
    }

    res.json(result.data);

  } catch (error) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'Account service error'
    });
  }
});

/**
 * @swagger
 * /openbanking/v1/accounts/{accountId}/balances:
 *   get:
 *     summary: Get account balances
 *     tags: [Account Information]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-consent-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account balances
 *       404:
 *         description: Account not found
 */
router.get('/accounts/:accountId/balances', authenticateTPP, validateConsent('account_info'), (req, res) => {
  try {
    const { accountId } = req.params;
    const result = FinancialDataService.getBalances(req.userId, accountId);

    if (!result.success) {
      return res.status(404).json({
        error: 'not_found',
        error_description: result.error
      });
    }

    res.json(result.data);

  } catch (error) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'Balance service error'
    });
  }
});

/**
 * @swagger
 * /openbanking/v1/accounts/{accountId}/transactions:
 *   get:
 *     summary: Get account transactions
 *     tags: [Account Information]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-consent-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Account transactions
 *       404:
 *         description: Account not found
 */
router.get('/accounts/:accountId/transactions', authenticateTPP, validateConsent('account_info'), (req, res) => {
  try {
    const { accountId } = req.params;
    const { fromDate, toDate, limit } = req.query;

    const result = FinancialDataService.getTransactions(
      req.userId, 
      accountId, 
      fromDate, 
      toDate, 
      parseInt(limit) || 50
    );

    if (!result.success) {
      return res.status(404).json({
        error: 'not_found',
        error_description: result.error
      });
    }

    res.json(result.data);

  } catch (error) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'Transaction service error'
    });
  }
});

// =============================================================================
// FUNDS CONFIRMATION SERVICES
// =============================================================================

/**
 * @swagger
 * /openbanking/v1/funds-confirmation:
 *   post:
 *     summary: Check funds availability
 *     tags: [Funds Confirmation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-consent-id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountId
 *               - amount
 *             properties:
 *               accountId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: INR
 *     responses:
 *       200:
 *         description: Funds confirmation result
 *       404:
 *         description: Account not found
 */
router.post('/funds-confirmation', authenticateTPP, validateConsent('balance_check'), (req, res) => {
  try {
    const { accountId, amount, currency } = req.body;

    if (!accountId || !amount) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing accountId or amount'
      });
    }

    const result = FinancialDataService.checkFundsAvailability(
      req.userId, 
      accountId, 
      amount, 
      currency || 'INR'
    );

    if (!result.success) {
      return res.status(404).json({
        error: 'not_found',
        error_description: result.error
      });
    }

    res.json(result.data);

  } catch (error) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'Funds confirmation service error'
    });
  }
});

// =============================================================================
// PAYMENT INITIATION SERVICES (PIS) - Simplified
// =============================================================================

/**
 * @swagger
 * /openbanking/v1/payments:
 *   post:
 *     summary: Initiate a payment
 *     tags: [Payment Initiation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-consent-id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromAccountId
 *               - amount
 *               - toAccount
 *             properties:
 *               fromAccountId:
 *                 type: string
 *               amount:
 *                 type: object
 *                 properties:
 *                   amount:
 *                     type: number
 *                   currency:
 *                     type: string
 *               toAccount:
 *                 type: object
 *                 properties:
 *                   accountNumber:
 *                     type: string
 *                   sortCode:
 *                     type: string
 *                   name:
 *                     type: string
 *               reference:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment initiated
 *       400:
 *         description: Invalid payment request
 */
router.post('/payments', authenticateTPP, validateConsent('payment_initiation'), (req, res) => {
  try {
    const { fromAccountId, amount, toAccount, reference } = req.body;

    if (!fromAccountId || !amount || !toAccount) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required payment fields'
      });
    }

    const result = FinancialDataService.createPayment(req.userId, fromAccountId, {
      amount,
      toAccount,
      reference
    });

    if (!result.success) {
      return res.status(400).json({
        error: 'payment_failed',
        error_description: result.error,
        details: result.details
      });
    }

    res.status(201).json(result.data);

  } catch (error) {
    res.status(500).json({
      error: 'server_error',
      error_description: 'Payment service error'
    });
  }
});

module.exports = router;