import { describe, expect, it, vi } from 'vitest';
import {
  enforceSingleInstance,
  type SingleInstanceAppLike,
  type SingleInstanceWindowLike,
} from '../../electron/singleInstance.ts';

describe('enforceSingleInstance', () => {
  it('quits immediately when another instance already holds the lock', () => {
    const appMock: SingleInstanceAppLike = {
      requestSingleInstanceLock: vi.fn(() => false),
      quit: vi.fn(),
      on: vi.fn(),
    };

    const acquired = enforceSingleInstance(appMock, () => null);
    expect(acquired).toBe(false);
    expect(appMock.quit).toHaveBeenCalledTimes(1);
    expect(appMock.on).not.toHaveBeenCalled();
  });

  it('restores, shows, and focuses the existing window when a second instance starts', () => {
    let secondInstanceHandler: (() => void) | undefined;
    const appMock: SingleInstanceAppLike = {
      requestSingleInstanceLock: vi.fn(() => true),
      quit: vi.fn(),
      on: vi.fn((event, listener) => {
        if (event === 'second-instance') {
          secondInstanceHandler = listener;
        }
      }),
    };

    const windowMock: SingleInstanceWindowLike = {
      isDestroyed: vi.fn(() => false),
      isMinimized: vi.fn(() => true),
      restore: vi.fn(),
      show: vi.fn(),
      focus: vi.fn(),
    };

    const acquired = enforceSingleInstance(appMock, () => windowMock);
    expect(acquired).toBe(true);
    expect(appMock.quit).not.toHaveBeenCalled();
    expect(secondInstanceHandler).toBeDefined();

    secondInstanceHandler?.();
    expect(windowMock.restore).toHaveBeenCalledTimes(1);
    expect(windowMock.show).toHaveBeenCalledTimes(1);
    expect(windowMock.focus).toHaveBeenCalledTimes(1);
  });
});
