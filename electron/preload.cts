import { contextBridge, ipcRenderer } from 'electron';

const IPC_CHANNELS = {
  VAULT_STATUS: 'vault:status',
  VAULT_SETUP: 'vault:setup',
  VAULT_UNLOCK: 'vault:unlock',
  VAULT_LOCK: 'vault:lock',
  VAULT_SAVE: 'vault:save',
  VAULT_RECOVER: 'vault:recover',
  VAULT_CHANGE_PASSWORD: 'vault:change-password',
  CLIPBOARD_WRITE_SENSITIVE: 'clipboard:write-sensitive',
  APP_GET_VERSION: 'app:get-version',
} as const;

contextBridge.exposeInMainWorld('pwManagerAPI', {
  getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.VAULT_STATUS),
  setupVault: (masterPassword: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_SETUP, masterPassword),
  unlockVault: (masterPassword: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_UNLOCK, masterPassword),
  lockVault: () => ipcRenderer.invoke(IPC_CHANNELS.VAULT_LOCK),
  saveVault: (vaultData: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_SAVE, vaultData),
  recoverVault: (
    recoveryPhrase: string,
    newMasterPassword: string,
    regenerateRecoveryPhrase?: boolean,
  ) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.VAULT_RECOVER,
      recoveryPhrase,
      newMasterPassword,
      regenerateRecoveryPhrase,
    ),
  changePassword: (currentPassword: string, newPassword: string) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.VAULT_CHANGE_PASSWORD,
      currentPassword,
      newPassword,
    ),
  writeSensitiveClipboard: (text: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_WRITE_SENSITIVE, text),
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
});
