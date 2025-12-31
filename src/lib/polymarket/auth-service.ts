/**
 * Polymarket Authentication Service
 * 
 * Manages API key lifecycle for Polymarket CLOB authentication.
 * Handles creation, derivation, storage, and retrieval of API credentials.
 * 
 * Security Features:
 * - Encrypted storage of API secrets
 * - Deterministic key derivation from wallet
 * - Secure credential management
 */

import { ClobClient, type Chain, type ApiKeyCreds } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import prisma from '../prisma';
import { encrypt, decrypt } from '../crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface StoredApiKey {
  userId: string;
  key: string;
  encryptedSecret: string;
  encryptedPassphrase: string;
  derivedFrom: string; // Wallet address
  createdAt: Date;
  lastUsed?: Date;
}

export interface ApiKeyOptions {
  nonce?: number;
  forceCreate?: boolean; // Force create new key instead of deriving
}

// ============================================================================
// POLYMARKET AUTH SERVICE
// ============================================================================

export class PolymarketAuthService {
  private host: string;
  private chainId: Chain;

  constructor(config?: { host?: string; chainId?: Chain }) {
    this.host = config?.host || process.env.POLYMARKET_API_URL || 'https://clob.polymarket.com';
    this.chainId = config?.chainId || (parseInt(process.env.CHAIN_ID || '137') as Chain);
  }

  // ==========================================================================
  // API KEY CREATION & DERIVATION
  // ==========================================================================

  /**
   * Create or derive API key for a wallet
   * Attempts to derive first (deterministic), falls back to create if needed
   * 
   * @param privateKey - Wallet private key
   * @param options - API key options
   * @returns API credentials
   */
  async createOrDeriveApiKey(
    privateKey: string,
    options?: ApiKeyOptions
  ): Promise<ApiKeyCreds> {
    try {
      const wallet = new Wallet(privateKey);
      const client = new ClobClient(this.host, this.chainId, wallet);

      // Try to derive first (deterministic and free)
      if (!options?.forceCreate) {
        try {
          const derivedCreds = await client.deriveApiKey(options?.nonce);
          console.log('✅ API key derived successfully');
          return derivedCreds;
        } catch (deriveError) {
          console.warn('⚠️  Failed to derive API key, attempting to create:', deriveError);
        }
      }

      // Fall back to creating a new key
      const createdCreds = await client.createApiKey(options?.nonce);
      console.log('✅ API key created successfully');
      return createdCreds;
    } catch (error) {
      console.error('❌ Error creating/deriving API key:', error);
      throw new Error('Failed to create or derive API key');
    }
  }

  /**
   * Create a new API key (requires L1 auth)
   * 
   * @param privateKey - Wallet private key
   * @param nonce - Optional nonce for key generation
   */
  async createApiKey(privateKey: string, nonce?: number): Promise<ApiKeyCreds> {
    try {
      const wallet = new Wallet(privateKey);
      const client = new ClobClient(this.host, this.chainId, wallet);

      const creds = await client.createApiKey(nonce);
      console.log('✅ New API key created');
      return creds;
    } catch (error) {
      console.error('❌ Error creating API key:', error);
      throw new Error('Failed to create API key');
    }
  }

  /**
   * Derive API key (deterministic from wallet)
   * 
   * @param privateKey - Wallet private key
   * @param nonce - Optional nonce for key generation
   */
  async deriveApiKey(privateKey: string, nonce?: number): Promise<ApiKeyCreds> {
    try {
      const wallet = new Wallet(privateKey);
      const client = new ClobClient(this.host, this.chainId, wallet);

      const creds = await client.deriveApiKey(nonce);
      console.log('✅ API key derived');
      return creds;
    } catch (error) {
      console.error('❌ Error deriving API key:', error);
      throw new Error('Failed to derive API key');
    }
  }

  // ==========================================================================
  // DATABASE STORAGE
  // ==========================================================================

  /**
   * Store API key in database with encryption
   * 
   * @param userId - User ID to associate with key
   * @param creds - API credentials
   * @param walletAddress - Associated wallet address
   */
  async storeApiKey(
    userId: string,
    creds: ApiKeyCreds,
    walletAddress: string
  ): Promise<void> {
    try {
      // Encrypt sensitive fields
      const encryptedSecret = encrypt(creds.secret);
      const encryptedPassphrase = encrypt(creds.passphrase);

      await prisma.polymarketApiKey.upsert({
        where: { userId },
        create: {
          userId,
          key: creds.key,
          encryptedSecret,
          encryptedPassphrase,
          derivedFrom: walletAddress,
          createdAt: new Date(),
        },
        update: {
          key: creds.key,
          encryptedSecret,
          encryptedPassphrase,
          derivedFrom: walletAddress,
          lastUsed: new Date(),
        },
      });

      console.log(`✅ API key stored for user ${userId}`);
    } catch (error) {
      console.error('❌ Error storing API key:', error);
      throw new Error('Failed to store API key');
    }
  }

  /**
   * Retrieve API key from database
   * 
   * @param userId - User ID
   * @returns Decrypted API credentials or null
   */
  async getApiKey(userId: string): Promise<ApiKeyCreds | null> {
    try {
      const stored = await prisma.polymarketApiKey.findUnique({
        where: { userId },
      });

      if (!stored) {
        return null;
      }

      // Update last used timestamp
      await prisma.polymarketApiKey.update({
        where: { userId },
        data: { lastUsed: new Date() },
      });

      // Decrypt and return
      return {
        key: stored.key,
        secret: decrypt(stored.encryptedSecret),
        passphrase: decrypt(stored.encryptedPassphrase),
      };
    } catch (error) {
      console.error('❌ Error retrieving API key:', error);
      return null;
    }
  }

  /**
   * Delete API key from database
   * 
   * @param userId - User ID
   */
  async deleteApiKey(userId: string): Promise<void> {
    try {
      await prisma.polymarketApiKey.delete({
        where: { userId },
      });
      console.log(`✅ API key deleted for user ${userId}`);
    } catch (error) {
      console.error('❌ Error deleting API key:', error);
      throw new Error('Failed to delete API key');
    }
  }

  /**
   * Revoke API key on Polymarket (requires wallet)
   * 
   * @param privateKey - Wallet private key
   * @param creds - API credentials to revoke
   */
  async revokeApiKey(privateKey: string, creds: ApiKeyCreds): Promise<void> {
    try {
      const wallet = new Wallet(privateKey);
      const client = new ClobClient(this.host, this.chainId, wallet, creds);

      await client.deleteApiKey();
      console.log('✅ API key revoked on Polymarket');
    } catch (error) {
      console.error('❌ Error revoking API key:', error);
      throw new Error('Failed to revoke API key');
    }
  }

  // ==========================================================================
  // KEY MANAGEMENT
  // ==========================================================================

  /**
   * Get or create API key for user
   * Retrieves from database if exists, otherwise creates new one
   * 
   * @param userId - User ID
   * @param privateKey - Wallet private key
   * @returns API credentials
   */
  async getOrCreateApiKey(userId: string, privateKey: string): Promise<ApiKeyCreds> {
    try {
      // Try to get existing key from database
      const existingKey = await this.getApiKey(userId);
      if (existingKey) {
        console.log(`✅ Retrieved existing API key for user ${userId}`);
        return existingKey;
      }

      // Create or derive new key
      const newKey = await this.createOrDeriveApiKey(privateKey);

      // Store in database
      const wallet = new Wallet(privateKey);
      const walletAddress = await wallet.getAddress();
      await this.storeApiKey(userId, newKey, walletAddress);

      return newKey;
    } catch (error) {
      console.error('❌ Error getting or creating API key:', error);
      throw new Error('Failed to get or create API key');
    }
  }

  /**
   * Rotate API key (delete old, create new)
   * 
   * @param userId - User ID
   * @param privateKey - Wallet private key
   */
  async rotateApiKey(userId: string, privateKey: string): Promise<ApiKeyCreds> {
    try {
      // Get existing key to revoke
      const existingKey = await this.getApiKey(userId);

      // Revoke on Polymarket if exists
      if (existingKey) {
        try {
          await this.revokeApiKey(privateKey, existingKey);
        } catch (revokeError) {
          console.warn('⚠️  Failed to revoke existing key on Polymarket:', revokeError);
        }
      }

      // Delete from database
      await this.deleteApiKey(userId);

      // Create new key
      const newKey = await this.createOrDeriveApiKey(privateKey, { forceCreate: true });

      // Store new key
      const wallet = new Wallet(privateKey);
      const walletAddress = await wallet.getAddress();
      await this.storeApiKey(userId, newKey, walletAddress);

      console.log(`✅ API key rotated for user ${userId}`);
      return newKey;
    } catch (error) {
      console.error('❌ Error rotating API key:', error);
      throw new Error('Failed to rotate API key');
    }
  }

  /**
   * Validate API key by attempting to use it
   * 
   * @param creds - API credentials to validate
   * @param privateKey - Wallet private key
   */
  async validateApiKey(creds: ApiKeyCreds, privateKey: string): Promise<boolean> {
    try {
      const wallet = new Wallet(privateKey);
      const client = new ClobClient(this.host, this.chainId, wallet, creds);

      // Try to fetch API keys as validation
      await client.getApiKeys();
      return true;
    } catch (error) {
      console.error('❌ API key validation failed:', error);
      return false;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let authServiceInstance: PolymarketAuthService | null = null;

export function getPolymarketAuthService(config?: { host?: string; chainId?: Chain }): PolymarketAuthService {
  if (!authServiceInstance) {
    authServiceInstance = new PolymarketAuthService(config);
  }
  return authServiceInstance;
}

export default PolymarketAuthService;
