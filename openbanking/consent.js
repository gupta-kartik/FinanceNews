// Open Banking Consent Management Module
const { v4: uuidv4 } = require('uuid');

// In-memory storage for consent records
const consentStore = new Map();
const consentHistory = new Map();

class ConsentManager {
  
  // Create a new consent request
  static createConsent(tppId, userId, permissions, validityPeriod = 90) {
    const consentId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityPeriod);

    const consent = {
      consentId,
      tppId,
      userId,
      permissions,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      validityPeriod,
      accessCount: 0,
      lastAccessed: null
    };

    consentStore.set(consentId, consent);
    
    // Add to history
    this.addToHistory(consentId, 'created', 'Consent request created');

    return { success: true, consentId, consent };
  }

  // Grant consent (user approval)
  static grantConsent(consentId, userConfirmation = true) {
    const consent = consentStore.get(consentId);
    
    if (!consent) {
      return { success: false, error: 'Consent not found' };
    }

    if (consent.status !== 'pending') {
      return { success: false, error: 'Consent is not in pending state' };
    }

    if (!userConfirmation) {
      consent.status = 'rejected';
      this.addToHistory(consentId, 'rejected', 'User rejected consent');
    } else {
      consent.status = 'granted';
      consent.grantedAt = new Date().toISOString();
      this.addToHistory(consentId, 'granted', 'User granted consent');
    }

    consentStore.set(consentId, consent);
    return { success: true, consent };
  }

  // Revoke consent
  static revokeConsent(consentId, reason = 'User revoked') {
    const consent = consentStore.get(consentId);
    
    if (!consent) {
      return { success: false, error: 'Consent not found' };
    }

    consent.status = 'revoked';
    consent.revokedAt = new Date().toISOString();
    consent.revocationReason = reason;

    consentStore.set(consentId, consent);
    this.addToHistory(consentId, 'revoked', reason);

    return { success: true, consent };
  }

  // Check if consent is valid for specific permission
  static validateConsent(consentId, requiredPermission) {
    const consent = consentStore.get(consentId);
    
    if (!consent) {
      return { valid: false, error: 'Consent not found' };
    }

    if (consent.status !== 'granted') {
      return { valid: false, error: `Consent status is ${consent.status}` };
    }

    if (new Date() > new Date(consent.expiresAt)) {
      // Auto-expire the consent
      consent.status = 'expired';
      consentStore.set(consentId, consent);
      this.addToHistory(consentId, 'expired', 'Consent automatically expired');
      return { valid: false, error: 'Consent has expired' };
    }

    if (!consent.permissions.includes(requiredPermission)) {
      return { valid: false, error: 'Permission not granted in consent' };
    }

    // Update access tracking
    consent.accessCount++;
    consent.lastAccessed = new Date().toISOString();
    consentStore.set(consentId, consent);

    return { valid: true, consent };
  }

  // Get consent details
  static getConsent(consentId) {
    const consent = consentStore.get(consentId);
    
    if (!consent) {
      return { success: false, error: 'Consent not found' };
    }

    return { success: true, consent };
  }

  // Get all consents for a user
  static getUserConsents(userId) {
    const userConsents = Array.from(consentStore.values())
      .filter(consent => consent.userId === userId);

    return { success: true, consents: userConsents };
  }

  // Get all consents for a TPP
  static getTPPConsents(tppId) {
    const tppConsents = Array.from(consentStore.values())
      .filter(consent => consent.tppId === tppId);

    return { success: true, consents: tppConsents };
  }

  // Add entry to consent history
  static addToHistory(consentId, action, details) {
    if (!consentHistory.has(consentId)) {
      consentHistory.set(consentId, []);
    }

    const historyEntry = {
      action,
      details,
      timestamp: new Date().toISOString()
    };

    consentHistory.get(consentId).push(historyEntry);
  }

  // Get consent history
  static getConsentHistory(consentId) {
    const history = consentHistory.get(consentId) || [];
    return { success: true, history };
  }

  // Check consents that are about to expire (within next 7 days)
  static getExpiringConsents() {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringConsents = Array.from(consentStore.values())
      .filter(consent => {
        return consent.status === 'granted' && 
               new Date(consent.expiresAt) <= sevenDaysFromNow;
      });

    return { success: true, consents: expiringConsents };
  }

  // Cleanup expired consents
  static cleanupExpiredConsents() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [consentId, consent] of consentStore.entries()) {
      if (consent.status === 'granted' && new Date(consent.expiresAt) < now) {
        consent.status = 'expired';
        consentStore.set(consentId, consent);
        this.addToHistory(consentId, 'expired', 'Automatically expired during cleanup');
        cleanedCount++;
      }
    }

    return { success: true, cleanedCount };
  }

  // Get consent statistics
  static getConsentStats() {
    const consents = Array.from(consentStore.values());
    
    const stats = {
      total: consents.length,
      pending: consents.filter(c => c.status === 'pending').length,
      granted: consents.filter(c => c.status === 'granted').length,
      rejected: consents.filter(c => c.status === 'rejected').length,
      revoked: consents.filter(c => c.status === 'revoked').length,
      expired: consents.filter(c => c.status === 'expired').length
    };

    return { success: true, stats };
  }
}

module.exports = ConsentManager;