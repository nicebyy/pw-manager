export interface SingleInstanceWindowLike {
  isDestroyed(): boolean;
  isMinimized(): boolean;
  restore(): void;
  show(): void;
  focus(): void;
}

export interface SingleInstanceAppLike {
  requestSingleInstanceLock(): boolean;
  quit(): void;
  on(event: 'second-instance', listener: () => void): void;
}

/**
 * Enforces single-instance execution.
 * If another instance is already running, quits immediately and returns false.
 * Otherwise, focuses/restores the existing main window whenever a second instance launches.
 */
export function enforceSingleInstance(
  appLike: SingleInstanceAppLike,
  getMainWindow: () => SingleInstanceWindowLike | null,
): boolean {
  const gotLock = appLike.requestSingleInstanceLock();
  if (!gotLock) {
    appLike.quit();
    return false;
  }

  appLike.on('second-instance', () => {
    const win = getMainWindow();
    if (!win || win.isDestroyed()) {
      return;
    }
    if (win.isMinimized()) {
      win.restore();
    }
    win.show();
    win.focus();
  });

  return true;
}
