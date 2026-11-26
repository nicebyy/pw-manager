import {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  Menu,
  nativeImage,
  Tray,
} from 'electron';
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
let tray: Tray | null = null;
let isQuitting = false;
let vaultStore: VaultFileStore | null = null;
let clipboardClearTimer: ReturnType<typeof setTimeout> | null = null;

function clearClipboardTimer(): void {
  if (clipboardClearTimer) {
    clearTimeout(clipboardClearTimer);
    clipboardClearTimer = null;
  }
}

function getAppIcon() {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  return nativeImage.createFromPath(iconPath);
}

function showAndFocusWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow();
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function createSystemTray(): void {
  if (tray) return;
  const appIcon = getAppIcon();
  const trayIcon = appIcon.isEmpty()
    ? nativeImage.createEmpty()
    : appIcon.resize({ width: 16, height: 16 });

  tray = new Tray(trayIcon);
  tray.setToolTip(APP_NAME);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `${APP_NAME} 열기`,
      click: () => showAndFocusWindow(),
    },
    {
      label: '금고 잠금',
      click: () => {
        if (vaultStore) {
          vaultStore.lock();
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.reload();
        }
      },
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => showAndFocusWindow());
  tray.on('double-click', () => showAndFocusWindow());
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
  const appIcon = getAppIcon();
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 880,
    minHeight: 600,
    title: APP_NAME,
    icon: appIcon.isEmpty() ? undefined : appIcon,
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

  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

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
    createSystemTray();

    app.on('activate', () => {
      showAndFocusWindow();
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
    clearClipboardTimer();
    if (tray) {
      tray.destroy();
      tray = null;
    }
    if (vaultStore) {
      vaultStore.lock();
    }
  });

  app.on('window-all-closed', () => {
    if (isQuitting && process.platform !== 'darwin') {
      app.quit();
    }
  });
}
