export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

export interface NodeImage {
  /** 'custom' for user-uploaded data URL image, 'preset' for built-in icon preset ID */
  type: 'custom' | 'preset';
  /** Base64 Data URL (when type === 'custom') or preset ID (when type === 'preset') */
  value: string;
}

export interface VaultNode {
  id: string;
  parentId: string | null;
  title: string;
  description?: string;
  image?: NodeImage;
  pairs: KeyValuePair[];
  children: VaultNode[];
  createdAt: string;
  updatedAt: string;
}

export interface VaultData {
  version: number;
  nodes: VaultNode[];
  updatedAt: string;
}

export interface EncryptedBlob {
  /** Base64 encoded 96-bit IV */
  iv: string;
  /** Base64 encoded 128-bit GCM authentication tag */
  authTag: string;
  /** Base64 encoded ciphertext */
  ciphertext: string;
}

export interface KeySlot {
  /** Base64 encoded random salt for scrypt */
  salt: string;
  scryptParams: {
    N: number;
    r: number;
    p: number;
  };
  /** DEK wrapped (encrypted) with the derived KEK using AES-256-GCM */
  wrappedDek: EncryptedBlob;
}

export interface EncryptedVaultEnvelope {
  formatVersion: number;
  cipher: 'aes-256-gcm';
  passwordSlot: KeySlot;
  recoverySlot: KeySlot;
  /** Entire VaultData JSON encrypted with DEK */
  payload: EncryptedBlob;
  updatedAt: string;
}

export type VaultLockState = 'uninitialized' | 'locked' | 'unlocked';

export interface VaultStatusInfo {
  state: VaultLockState;
  vaultPath: string;
  updatedAt?: string;
}
