import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomInt,
  scrypt,
} from 'node:crypto';
import { CRYPTO_CONFIG } from '../constants/crypto.js';
import { RECOVERY_WORDLIST } from './wordlist.js';
import {
  formatRecoveryPhraseGrid,
  normalizeRecoveryPhrase,
} from './recoveryFormat.js';
import type {
  EncryptedBlob,
  EncryptedVaultEnvelope,
  KeySlot,
  VaultData,
} from '../types/vault.js';

export { formatRecoveryPhraseGrid, normalizeRecoveryPhrase };

export class VaultCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultCryptoError';
  }
}

/**
 * Overwrites a Buffer with zeros in memory to minimize sensitive key exposure.
 */
export function zeroizeBuffer(buf: Buffer | null | undefined): void {
  if (buf && Buffer.isBuffer(buf)) {
    buf.fill(0);
  }
}

/**
 * Generates a high-entropy recovery phrase with no duplicate words using CSPRNG (`crypto.randomInt`).
 */
export function generateRecoveryPhrase(
  wordCount: number = CRYPTO_CONFIG.RECOVERY_WORD_COUNT,
): string {
  const listLength = RECOVERY_WORDLIST.length;
  if (wordCount > listLength) {
    throw new VaultCryptoError('Requested word count exceeds wordlist size');
  }

  const usedIndices = new Set<number>();
  const words: string[] = [];

  while (words.length < wordCount) {
    const idx = randomInt(0, listLength);
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      words.push(RECOVERY_WORDLIST[idx]);
    }
  }

  return words.join(' ');
}

/**
 * Derives a 256-bit Key Encryption Key (KEK) from a secret and salt using scrypt.
 */
export function deriveKeyWithScrypt(
  secret: string,
  salt: Buffer,
  params: { N: number; r: number; p: number } = {
    N: CRYPTO_CONFIG.SCRYPT_COST_N,
    r: CRYPTO_CONFIG.SCRYPT_BLOCK_SIZE_R,
    p: CRYPTO_CONFIG.SCRYPT_PARALLELISM_P,
  },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      secret,
      salt,
      CRYPTO_CONFIG.KEY_LENGTH_BYTES,
      {
        N: params.N,
        r: params.r,
        p: params.p,
        maxmem: CRYPTO_CONFIG.SCRYPT_MAXMEM_BYTES,
      },
      (err, derivedKey) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}

/**
 * Encrypts arbitrary plaintext bytes with AES-256-GCM and a fresh 96-bit random IV.
 */
export function encryptWithKey(plaintext: Buffer, key: Buffer): EncryptedBlob {
  if (key.length !== CRYPTO_CONFIG.KEY_LENGTH_BYTES) {
    throw new VaultCryptoError('Invalid encryption key length');
  }
  const iv = randomBytes(CRYPTO_CONFIG.IV_LENGTH_BYTES);
  const cipher = createCipheriv(CRYPTO_CONFIG.CIPHER_ALGORITHM, key, iv, {
    authTagLength: CRYPTO_CONFIG.AUTH_TAG_LENGTH_BYTES,
  });
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}

/**
 * Decrypts an AES-256-GCM EncryptedBlob and verifies its authentication tag.
 * Throws VaultCryptoError if the key is wrong or the payload was tampered with.
 */
export function decryptWithKey(blob: EncryptedBlob, key: Buffer): Buffer {
  if (key.length !== CRYPTO_CONFIG.KEY_LENGTH_BYTES) {
    throw new VaultCryptoError('Invalid decryption key length');
  }
  try {
    const iv = Buffer.from(blob.iv, 'base64');
    const authTag = Buffer.from(blob.authTag, 'base64');
    const ciphertext = Buffer.from(blob.ciphertext, 'base64');

    const decipher = createDecipheriv(CRYPTO_CONFIG.CIPHER_ALGORITHM, key, iv, {
      authTagLength: CRYPTO_CONFIG.AUTH_TAG_LENGTH_BYTES,
    });
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new VaultCryptoError('Decryption failed: invalid credentials or corrupted data');
  }
}

async function createKeySlot(secret: string, dek: Buffer): Promise<KeySlot> {
  const salt = randomBytes(CRYPTO_CONFIG.SALT_LENGTH_BYTES);
  const scryptParams = {
    N: CRYPTO_CONFIG.SCRYPT_COST_N,
    r: CRYPTO_CONFIG.SCRYPT_BLOCK_SIZE_R,
    p: CRYPTO_CONFIG.SCRYPT_PARALLELISM_P,
  };
  const kek = await deriveKeyWithScrypt(secret, salt, scryptParams);
  try {
    const wrappedDek = encryptWithKey(dek, kek);
    return {
      salt: salt.toString('base64'),
      scryptParams,
      wrappedDek,
    };
  } finally {
    zeroizeBuffer(kek);
  }
}

async function unwrapKeySlot(secret: string, slot: KeySlot): Promise<Buffer> {
  const salt = Buffer.from(slot.salt, 'base64');
  const kek = await deriveKeyWithScrypt(secret, salt, slot.scryptParams);
  try {
    return decryptWithKey(slot.wrappedDek, kek);
  } finally {
    zeroizeBuffer(kek);
  }
}

/**
 * Creates a brand new encrypted vault envelope protected by both a master password
 * and a freshly generated recovery phrase (Dual-Key Envelope Encryption).
 */
export async function createEncryptedVault(
  masterPassword: string,
  initialData: VaultData,
): Promise<{
  envelope: EncryptedVaultEnvelope;
  recoveryPhrase: string;
  dek: Buffer;
}> {
  const dek = randomBytes(CRYPTO_CONFIG.KEY_LENGTH_BYTES);
  const recoveryPhrase = generateRecoveryPhrase();
  const normalizedPhrase = normalizeRecoveryPhrase(recoveryPhrase);

  const passwordSlot = await createKeySlot(masterPassword, dek);
  const recoverySlot = await createKeySlot(normalizedPhrase, dek);
  const payloadBuffer = Buffer.from(JSON.stringify(initialData), 'utf8');
  const payload = encryptWithKey(payloadBuffer, dek);
  zeroizeBuffer(payloadBuffer);

  const envelope: EncryptedVaultEnvelope = {
    formatVersion: CRYPTO_CONFIG.VAULT_FORMAT_VERSION,
    cipher: CRYPTO_CONFIG.CIPHER_ALGORITHM,
    passwordSlot,
    recoverySlot,
    payload,
    updatedAt: initialData.updatedAt,
  };

  return { envelope, recoveryPhrase, dek };
}

/**
 * Unlocks an encrypted vault using the user's master password.
 */
export async function unlockVaultWithPassword(
  envelope: EncryptedVaultEnvelope,
  masterPassword: string,
): Promise<{ vaultData: VaultData; dek: Buffer }> {
  const dek = await unwrapKeySlot(masterPassword, envelope.passwordSlot);
  try {
    const plaintext = decryptWithKey(envelope.payload, dek);
    const vaultData = JSON.parse(plaintext.toString('utf8')) as VaultData;
    zeroizeBuffer(plaintext);
    return { vaultData, dek };
  } catch (err) {
    zeroizeBuffer(dek);
    if (err instanceof VaultCryptoError) {
      throw err;
    }
    throw new VaultCryptoError('Failed to parse decrypted vault data');
  }
}

/**
 * Re-encrypts updated VaultData using the active in-memory DEK.
 */
export function saveVaultWithDek(
  envelope: EncryptedVaultEnvelope,
  dek: Buffer,
  vaultData: VaultData,
): EncryptedVaultEnvelope {
  const updatedAt = new Date().toISOString();
  const dataToEncrypt: VaultData = {
    ...vaultData,
    updatedAt,
  };
  const payloadBuffer = Buffer.from(JSON.stringify(dataToEncrypt), 'utf8');
  try {
    const payload = encryptWithKey(payloadBuffer, dek);
    return {
      ...envelope,
      payload,
      updatedAt,
    };
  } finally {
    zeroizeBuffer(payloadBuffer);
  }
}

/**
 * Recovers an encrypted vault using the one-time recovery phrase and sets a new master password.
 * If the recovery phrase is invalid, decryption fails and data remains permanently inaccessible.
 */
export async function recoverVaultWithPhrase(
  envelope: EncryptedVaultEnvelope,
  recoveryPhrase: string,
  newMasterPassword: string,
  regenerateRecoveryPhrase = false,
): Promise<{
  envelope: EncryptedVaultEnvelope;
  vaultData: VaultData;
  dek: Buffer;
  newRecoveryPhrase?: string;
}> {
  const normalized = normalizeRecoveryPhrase(recoveryPhrase);
  const dek = await unwrapKeySlot(normalized, envelope.recoverySlot);
  try {
    const plaintext = decryptWithKey(envelope.payload, dek);
    const vaultData = JSON.parse(plaintext.toString('utf8')) as VaultData;
    zeroizeBuffer(plaintext);

    const newPasswordSlot = await createKeySlot(newMasterPassword, dek);
    let newRecoverySlot = envelope.recoverySlot;
    let newRecoveryPhrase: string | undefined;

    if (regenerateRecoveryPhrase) {
      newRecoveryPhrase = generateRecoveryPhrase();
      newRecoverySlot = await createKeySlot(
        normalizeRecoveryPhrase(newRecoveryPhrase),
        dek,
      );
    }

    const updatedEnvelope: EncryptedVaultEnvelope = {
      ...envelope,
      passwordSlot: newPasswordSlot,
      recoverySlot: newRecoverySlot,
      updatedAt: new Date().toISOString(),
    };

    return {
      envelope: updatedEnvelope,
      vaultData,
      dek,
      newRecoveryPhrase,
    };
  } catch (err) {
    zeroizeBuffer(dek);
    if (err instanceof VaultCryptoError) {
      throw err;
    }
    throw new VaultCryptoError('Recovery failed: invalid recovery phrase');
  }
}

/**
 * Changes the master password by verifying the current password and re-wrapping the DEK.
 */
export async function changeMasterPassword(
  envelope: EncryptedVaultEnvelope,
  currentPassword: string,
  newPassword: string,
): Promise<{ envelope: EncryptedVaultEnvelope; dek: Buffer }> {
  const { dek } = await unlockVaultWithPassword(envelope, currentPassword);
  try {
    const newPasswordSlot = await createKeySlot(newPassword, dek);
    return {
      envelope: {
        ...envelope,
        passwordSlot: newPasswordSlot,
        updatedAt: new Date().toISOString(),
      },
      dek,
    };
  } catch (err) {
    zeroizeBuffer(dek);
    throw err;
  }
}
