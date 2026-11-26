export const CRYPTO_CONFIG = {
  VAULT_FORMAT_VERSION: 1,
  CIPHER_ALGORITHM: 'aes-256-gcm' as const,
  KEY_LENGTH_BYTES: 32, // 256-bit DEK & KEK
  IV_LENGTH_BYTES: 12, // 96-bit standard GCM nonce
  AUTH_TAG_LENGTH_BYTES: 16, // 128-bit GCM auth tag
  SALT_LENGTH_BYTES: 32, // 256-bit salt per key slot
  SCRYPT_COST_N: 16384, // 2^14 memory-hard cost
  SCRYPT_BLOCK_SIZE_R: 8,
  SCRYPT_PARALLELISM_P: 1,
  SCRYPT_MAXMEM_BYTES: 64 * 1024 * 1024, // 64 MiB
  RECOVERY_WORD_COUNT: 12,
} as const;
