/**
 * Secure Credential Storage Service
 * 
 * Implements secure credential storage using electron's keytar for OS-level credential management.
 * Provides encrypted storage for API keys, tokens, and other sensitive data.
 */

import * as keytar from 'keytar';
import { randomBytes, createCipher, createDecipher } from 'crypto';
import { safeLog, safeError, safeWarn } from '../utils/safeLogger';

// Service configuration
const SERVICE_NAME = 'Puffin-AI-Assistant';
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

// Credential types
export interface StoredCredential {
  service: string;
  account: string;
  credential: string;
  metadata?: {
    createdAt: string;
    lastAccessed: string;
    expiresAt?: string;
    permissions?: string[];
  };
}

export interface CredentialRequest {
  service: string;
  account: string;
  credential: string;
  metadata?: {
    expiresAt?: string;
    permissions?: string[];
  };
}

/**
 * Enhanced credential storage with encryption and validation
 */
export class SecureCredentialStorage {
  private encryptionKey: Buffer | null = null;
  private initialized = false;

  constructor() {
    this.initializeEncryption();
  }

  /**
   * Initialize encryption key from OS keychain or create new one
   */
  private async initializeEncryption(): Promise<void> {
    try {
      // Try to get existing encryption key
      let keyString = await keytar.getPassword(SERVICE_NAME, 'encryption-key');
      
      if (!keyString) {
        // Generate new encryption key
        this.encryptionKey = randomBytes(32);
        keyString = this.encryptionKey.toString('base64');
        
        // Store in OS keychain
        await keytar.setPassword(SERVICE_NAME, 'encryption-key', keyString);
        safeLog('Created new encryption key for credential storage');
      } else {
        this.encryptionKey = Buffer.from(keyString, 'base64');
        safeLog('Loaded existing encryption key for credential storage');
      }
      
      this.initialized = true;
    } catch (error) {
      safeError('Failed to initialize credential storage encryption:', error);
      throw new Error('Credential storage initialization failed');
    }
  }

  /**
   * Store encrypted credential securely
   */
  async storeCredential(request: CredentialRequest): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.initialized || !this.encryptionKey) {
        throw new Error('Credential storage not initialized');
      }

      // Validate input
      if (!request.service || !request.account || !request.credential) {
        throw new Error('Service, account, and credential are required');
      }

      // Create credential object with metadata
      const credentialData: StoredCredential = {
        service: request.service,
        account: request.account,
        credential: request.credential,
        metadata: {
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          expiresAt: request.metadata?.expiresAt,
          permissions: request.metadata?.permissions || []
        }
      };

      // Encrypt the credential data
      const encryptedData = this.encryptData(JSON.stringify(credentialData));
      
      // Store in OS keychain with service-specific key
      const keychainKey = `${request.service}:${request.account}`;
      await keytar.setPassword(SERVICE_NAME, keychainKey, encryptedData);

      safeLog(`Stored credential for ${request.service}:${request.account}`);
      return { success: true };

    } catch (error: any) {
      safeError('Failed to store credential:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Retrieve and decrypt credential
   */
  async getCredential(service: string, account: string): Promise<StoredCredential | null> {
    try {
      if (!this.initialized || !this.encryptionKey) {
        throw new Error('Credential storage not initialized');
      }

      // Validate input
      if (!service || !account) {
        throw new Error('Service and account are required');
      }

      const keychainKey = `${service}:${account}`;
      const encryptedData = await keytar.getPassword(SERVICE_NAME, keychainKey);

      if (!encryptedData) {
        return null; // Credential not found
      }

      // Decrypt and parse credential data
      const decryptedData = this.decryptData(encryptedData);
      const credential: StoredCredential = JSON.parse(decryptedData);

      // Check expiration
      if (credential.metadata?.expiresAt) {
        const expiryDate = new Date(credential.metadata.expiresAt);
        if (expiryDate < new Date()) {
          safeWarn(`Credential for ${service}:${account} has expired`);
          await this.deleteCredential(service, account); // Clean up expired credential
          return null;
        }
      }

      // Update last accessed time
      credential.metadata = {
        ...credential.metadata,
        lastAccessed: new Date().toISOString()
      };

      // Re-store with updated metadata
      const encryptedUpdated = this.encryptData(JSON.stringify(credential));
      await keytar.setPassword(SERVICE_NAME, keychainKey, encryptedUpdated);

      return credential;

    } catch (error: any) {
      safeError('Failed to retrieve credential:', error);
      return null;
    }
  }

  /**
   * Delete credential from storage
   */
  async deleteCredential(service: string, account: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!service || !account) {
        throw new Error('Service and account are required');
      }

      const keychainKey = `${service}:${account}`;
      const deleted = await keytar.deletePassword(SERVICE_NAME, keychainKey);

      if (deleted) {
        safeLog(`Deleted credential for ${service}:${account}`);
        return { success: true };
      } else {
        return { success: false, error: 'Credential not found' };
      }

    } catch (error: any) {
      safeError('Failed to delete credential:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all stored credentials (metadata only, no actual credentials)
   */
  async listCredentials(): Promise<Array<{ service: string; account: string; metadata?: any }>> {
    try {
      if (!this.initialized) {
        throw new Error('Credential storage not initialized');
      }

      // Note: keytar doesn't provide a native way to list all keys
      // This is a limitation - we would need to maintain an index
      // For now, return empty array
      safeWarn('Listing credentials not fully implemented - keytar limitation');
      return [];

    } catch (error: any) {
      safeError('Failed to list credentials:', error);
      return [];
    }
  }

  /**
   * Validate credential permissions for operation
   */
  validatePermission(credential: StoredCredential, requiredPermission: string): boolean {
    if (!credential.metadata?.permissions) {
      return false; // No permissions defined - deny access
    }

    return credential.metadata.permissions.includes(requiredPermission) || 
           credential.metadata.permissions.includes('*'); // Wildcard permission
  }

  /**
   * Encrypt data using the stored encryption key
   */
  private encryptData(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const iv = randomBytes(16);
    const cipher = createCipher(ENCRYPTION_ALGORITHM, this.encryptionKey);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV to encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt data using the stored encryption key
   */
  private decryptData(encryptedData: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = createDecipher(ENCRYPTION_ALGORITHM, this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Clear all encryption keys and reset (for security/testing)
   */
  async clearAllCredentials(): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete the encryption key (this will make all stored credentials inaccessible)
      await keytar.deletePassword(SERVICE_NAME, 'encryption-key');
      
      this.encryptionKey = null;
      this.initialized = false;
      
      safeWarn('All credentials and encryption keys cleared');
      return { success: true };

    } catch (error: any) {
      safeError('Failed to clear credentials:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if credential storage is properly initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.encryptionKey !== null;
  }
}

// Export singleton instance
export const credentialStorage = new SecureCredentialStorage();
export default credentialStorage;
