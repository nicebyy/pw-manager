import type { VaultBridgeAPI } from '../types/ipc.ts';

let overrideBridge: VaultBridgeAPI | null = null;

export function setVaultBridgeOverride(bridge: VaultBridgeAPI | null): void {
  overrideBridge = bridge;
}

export function getVaultBridge(): VaultBridgeAPI {
  if (overrideBridge) {
    return overrideBridge;
  }
  if (typeof window !== 'undefined' && window.pwManagerAPI) {
    return window.pwManagerAPI;
  }
  throw new Error('Electron pwManagerAPI bridge is not available in this environment');
}
