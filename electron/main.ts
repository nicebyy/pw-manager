import { app, BrowserWindow, clipboard, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enforceSingleInstance } from './singleInstance.js';
import { VaultFileStore } from './vaultFileStore.js';
import {
  APP_NAME,
  IPC_CHANNELS,
  SECURITY_DEFAULTS,
} from '../src/constants/app.js';
import type { VaultData } from '../src/types/vault.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let vaultStore: VaultFileStore | null = null;
let clipboardClearTimer: ReturnType<typeof setTimeout> | null = null;

function clearClipboardTimer(): void {
  if (clipboardClearTimer) {
    clearTimeout(clipboardClearTimer);
    clipboardClearTimer = null;
  }
}

function getVaultStore(): VaultFileStore {
  if (!vaultStore) {
    const vaultDir = path.join(app.getPath('userData'), 'vault');
    vaultStore = new VaultFileStore(vaultDir);
  }
  return vaultStore;
}

function createMainWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.cjs');
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 880,
    minHeight: 600,
    title: APP_NAME,
    backgroundColor: '#020617',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, targetUrl) => {
    const allowedOrigin = !app.isPackaged ? 'http://localhost:5173' : 'file://';
    if (!targetUrl.startsWith(allowedOrigin)) {
      event.preventDefault();
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || (!app.isPackaged ? 'http://localhost:5173' : '');
  if (!app.isPackaged && devServerUrl) {
    win.loadURL(devServerUrl);
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  return win;
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.VAULT_STATUS, async () => {
    return getVaultStore().getStatus();
  });

  ipcMain.handle(
    IPC_CHANNELS.VAULT_SETUP,
    async (_event, masterPassword: string) => {
      return getVaultStore().setup(masterPassword);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.VAULT_UNLOCK,
    async (_event, masterPassword: string) => {
      return getVaultStore().unlock(masterPassword);
    },
  );

  ipcMain.handle(IPC_CHANNELS.VAULT_LOCK, async () => {
    const store = getVaultStore();
    store.lock();
    return store.getStatus();
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_SAVE, async (_event, vaultData: VaultData) => {
    return getVaultStore().save(vaultData);
  });

  ipcMain.handle(
    IPC_CHANNELS.VAULT_RECOVER,
    async (
      _event,
      recoveryPhrase: string,
      newMasterPassword: string,
      regenerateRecoveryPhrase?: boolean,
    ) => {
      return getVaultStore().recover(
        recoveryPhrase,
        newMasterPassword,
        regenerateRecoveryPhrase,
      );
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.VAULT_CHANGE_PASSWORD,
    async (_event, currentPassword: string, newPassword: string) => {
      return getVaultStore().changePassword(currentPassword, newPassword);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CLIPBOARD_WRITE_SENSITIVE,
    async (_event, text: string) => {
      clipboard.writeText(text);
      clearClipboardTimer();
      clipboardClearTimer = setTimeout(() => {
        if (clipboard.readText() === text) {
          clipboard.clear();
        }
        clipboardClearTimer = null;
      }, SECURITY_DEFAULTS.CLIPBOARD_CLEAR_DELAY_MS);
    },
  );

  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => app.getVersion());
}

const isPrimaryInstance = enforceSingleInstance(app, () => mainWindow);

if (isPrimaryInstance) {
  app.whenReady().then(() => {
    registerIpcHandlers();
    mainWindow = createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
      }
    });
  });

  app.on('before-quit', () => {
    clearClipboardTimer();
    if (vaultStore) {
      vaultStore.lock();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
