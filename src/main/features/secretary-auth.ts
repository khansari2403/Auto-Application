import { getAllQuery, runQuery, getDatabase } from '../database';
import * as crypto from 'crypto';

interface SecretarySession {
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  userId: number;
}

// In-memory session store (in production, use Redis or similar)
const sessions: Map<string, SecretarySession> = new Map();

// Session duration: 8 hours
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

/**
 * Hash PIN using SHA-256
 */
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

/**
 * Generate secure session ID
 */
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set up Secretary PIN (first time setup)
 */
export async function setupSecretaryPin(userId: number, pin: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate PIN format (4-8 digits)
    if (!/^\d{4,8}$/.test(pin)) {
      return { success: false, error: 'PIN must be 4-8 digits' };
    }
    
    const hashedPin = hashPin(pin);
    
    // Check if settings exist
    const settings = await getAllQuery('SELECT * FROM settings');
    
    if (settings.length > 0) {
      await runQuery('UPDATE settings', {
        id: settings[0].id,
        secretary_pin: hashedPin,
        secretary_pin_set: 1
      });
    } else {
      await runQuery('INSERT INTO settings', {
        user_id: userId,
        secretary_pin: hashedPin,
        secretary_pin_set: 1
      });
    }
    
    return { success: true };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Verify Secretary PIN and create session
 */
export async function verifySecretaryPin(userId: number, pin: string): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const settings = await getAllQuery('SELECT * FROM settings');
    const userSettings = settings.find((s: any) => s.user_id === userId) || settings[0];
    
    if (!userSettings?.secretary_pin) {
      return { success: false, error: 'Secretary PIN not set. Please set up PIN first.' };
    }
    
    const hashedPin = hashPin(pin);
    
    if (hashedPin !== userSettings.secretary_pin) {
      return { success: false, error: 'Invalid PIN' };
    }
    
    // Create session
    const sessionId = generateSessionId();
    const now = new Date();
    
    sessions.set(sessionId, {
      sessionId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
      userId
    });
    
    return { success: true, sessionId };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Validate session
 */
export function validateSession(sessionId: string): { valid: boolean; userId?: number } {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return { valid: false };
  }
  
  if (new Date() > session.expiresAt) {
    sessions.delete(sessionId);
    return { valid: false };
  }
  
  return { valid: true, userId: session.userId };
}

/**
 * Invalidate session (logout)
 */
export function invalidateSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Change Secretary PIN
 */
export async function changeSecretaryPin(userId: number, currentPin: string, newPin: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify current PIN first
    const verifyResult = await verifySecretaryPin(userId, currentPin);
    
    if (!verifyResult.success) {
      return { success: false, error: 'Current PIN is incorrect' };
    }
    
    // Invalidate the session created during verification
    if (verifyResult.sessionId) {
      invalidateSession(verifyResult.sessionId);
    }
    
    // Set new PIN
    return await setupSecretaryPin(userId, newPin);
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if Secretary PIN is set
 */
export async function isSecretaryPinSet(userId: number): Promise<boolean> {
  try {
    const settings = await getAllQuery('SELECT * FROM settings');
    const userSettings = settings.find((s: any) => s.user_id === userId) || settings[0];
    
    return !!(userSettings?.secretary_pin && userSettings?.secretary_pin_set === 1);
  } catch {
    return false;
  }
}

/**
 * Reset Secretary PIN (requires main user authentication - for recovery)
 */
export async function resetSecretaryPin(userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getAllQuery('SELECT * FROM settings');
    
    if (settings.length > 0) {
      await runQuery('UPDATE settings', {
        id: settings[0].id,
        secretary_pin: null,
        secretary_pin_set: 0
      });
    }
    
    // Clear all sessions
    sessions.clear();
    
    return { success: true };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get Secretary access settings
 */
export async function getSecretaryAccessSettings(userId: number): Promise<any> {
  try {
    const settings = await getAllQuery('SELECT * FROM settings');
    const userSettings = settings.find((s: any) => s.user_id === userId) || settings[0];
    
    return {
      pinSet: !!(userSettings?.secretary_pin_set),
      secretaryEnabled: userSettings?.secretary_enabled === 1,
      allowedActions: userSettings?.secretary_allowed_actions || ['view_applications', 'send_followups'],
      lastAccess: userSettings?.secretary_last_access || null
    };
  } catch {
    return {
      pinSet: false,
      secretaryEnabled: false,
      allowedActions: [],
      lastAccess: null
    };
  }
}

/**
 * Update Secretary access permissions
 */
export async function updateSecretaryPermissions(userId: number, permissions: {
  enabled?: boolean;
  allowedActions?: string[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getAllQuery('SELECT * FROM settings');
    
    const updateData: any = { id: settings[0]?.id || 1 };
    
    if (permissions.enabled !== undefined) {
      updateData.secretary_enabled = permissions.enabled ? 1 : 0;
    }
    
    if (permissions.allowedActions) {
      updateData.secretary_allowed_actions = JSON.stringify(permissions.allowedActions);
    }
    
    if (settings.length > 0) {
      await runQuery('UPDATE settings', updateData);
    } else {
      await runQuery('INSERT INTO settings', {
        user_id: userId,
        ...updateData
      });
    }
    
    return { success: true };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Log Secretary access
 */
export async function logSecretaryAccess(userId: number, action: string): Promise<void> {
  try {
    const settings = await getAllQuery('SELECT * FROM settings');
    
    if (settings.length > 0) {
      await runQuery('UPDATE settings', {
        id: settings[0].id,
        secretary_last_access: new Date().toISOString(),
        secretary_last_action: action
      });
    }
  } catch (error) {
    console.error('Failed to log secretary access:', error);
  }
}
