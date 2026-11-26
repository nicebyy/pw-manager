import type { VaultData, VaultStatusInfo } from './vault.ts';

export interface SetupVaultResult {
  recoveryPhrase: string;
  vaultData: VaultData;
  status: VaultStatusInfo;
}

export interface UnlockVaultResult {
  vaultData: VaultData;
  status: VaultStatusInfo;
}

export interface RecoverVaultResult {
  vaultData: VaultData;
  status: VaultStatusInfo;
  newRecoveryPhrase?: string;
}

export interface VaultBridgeAPI {
  getStatus: () => Promise<VaultStatusInfo>;
  setupVault: (masterPassword: string) => Promise<SetupVaultResult>;
  unlockVault: (masterPassword: string) => Promise<UnlockVaultResult>;
  lockVault: () => Promise<VaultStatusInfo>;
  saveVault: (vaultData: VaultData) => Promise<VaultStatusInfo>;
  recoverVault: (
    recoveryPhrase: string,
    newMasterPassword: string,
    regenerateRecoveryPhrase?: boolean,
  ) => Promise<RecoverVaultResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<VaultStatusInfo>;
  writeSensitiveClipboard: (text: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    pwManagerAPI?: VaultBridgeAPI;
  }
}
