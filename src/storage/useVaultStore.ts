import { create } from 'zustand';
import { SECURITY_DEFAULTS, UI_DEFAULTS } from '../constants/app.ts';
import {
  addNodeToTree,
  createKeyValuePair,
  createVaultNode,
  deleteNodeFromTree,
  updateNodeInTree,
} from '../core/tree.ts';
import { translate, type TranslationKey } from '../locales/index.ts';
import type { Language, TranslationParams } from '../types/i18n.ts';
import type { NodeImage, VaultData, VaultNode, VaultStatusInfo } from '../types/vault.ts';
import { getVaultBridge } from './vaultClient.ts';

const LANGUAGE_STORAGE_KEY = 'pw-manager:language';
const AUTOLOCK_STORAGE_KEY = 'pw-manager:autoLockMinutes';

let activeSavePromise: Promise<void> | null = null;

function loadSavedLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'ko' || saved === 'en') {
      return saved;
    }
  } catch {
    // Ignore localStorage unavailability
  }
  return UI_DEFAULTS.DEFAULT_LANGUAGE;
}

function loadSavedAutoLockMinutes(): number {
  try {
    const raw = localStorage.getItem(AUTOLOCK_STORAGE_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore localStorage unavailability
  }
  return SECURITY_DEFAULTS.AUTO_LOCK_MINUTES_DEFAULT;
}

function collectAllNodeIds(nodes: VaultNode[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  const walk = (list: VaultNode[]) => {
    for (const n of list) {
      if (n.children.length > 0) {
        map[n.id] = true;
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return map;
}

export interface VaultStoreState {
  initialized: boolean;
  status: VaultStatusInfo;
  vaultData: VaultData | null;
  selectedNodeId: string | null;
  expandedNodeIds: Record<string, boolean>;
  searchQuery: string;
  language: Language;
  autoLockMinutes: number;
  isDirty: boolean;
  pendingRecoveryPhrase: string | null;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  errorMessage: string | null;

  t: (key: TranslationKey, params?: TranslationParams) => string;
  setLanguage: (lang: Language) => void;
  setAutoLockMinutes: (minutes: number) => void;
  setSearchQuery: (query: string) => void;
  setDirty: (dirty: boolean) => void;
  clearError: () => void;

  refreshStatus: () => Promise<void>;
  setupVault: (masterPassword: string) => Promise<void>;
  acknowledgeRecoveryPhrase: () => void;
  unlockVault: (masterPassword: string) => Promise<void>;
  lockVault: () => Promise<void>;
  recoverVault: (
    recoveryPhrase: string,
    newMasterPassword: string,
    regenerate?: boolean,
  ) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  selectNode: (nodeId: string | null) => void;
  toggleExpand: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  addNode: (parentId: string | null, title: string, image?: NodeImage) => Promise<string | null>;
  updateNode: (
    nodeId: string,
    patch: Partial<Pick<VaultNode, 'title' | 'description' | 'image' | 'pairs'>>,
  ) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  copySensitive: (text: string) => Promise<void>;
}

async function persistVault(
  nextVault: VaultData,
  set: (partial: Partial<VaultStoreState>) => void,
  t: (key: TranslationKey) => string,
): Promise<void> {
  const run = (async () => {
    try {
      const status = await getVaultBridge().saveVault(nextVault);
      set({ status, saveState: 'saved', errorMessage: null });
    } catch (err) {
      set({
        saveState: 'error',
        errorMessage: err instanceof Error ? err.message : t('saveFailedError'),
      });
    }
  })();

  activeSavePromise = run;
  try {
    await run;
  } finally {
    if (activeSavePromise === run) {
      activeSavePromise = null;
    }
  }
}

export const useVaultStore = create<VaultStoreState>((set, get) => ({
  initialized: false,
  status: { state: 'locked', vaultPath: '' },
  vaultData: null,
  selectedNodeId: null,
  expandedNodeIds: {},
  searchQuery: '',
  language: loadSavedLanguage(),
  autoLockMinutes: loadSavedAutoLockMinutes(),
  isDirty: false,
  pendingRecoveryPhrase: null,
  saveState: 'idle',
  errorMessage: null,

  t: (key, params) => translate(get().language, key, params),

  setLanguage: (lang) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
    set({ language: lang });
  },

  setAutoLockMinutes: (minutes) => {
    try {
      localStorage.setItem(AUTOLOCK_STORAGE_KEY, String(minutes));
    } catch {
      // Ignore storage errors
    }
    set({ autoLockMinutes: minutes });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setDirty: (dirty) => set({ isDirty: dirty }),

  clearError: () => set({ errorMessage: null }),

  refreshStatus: async () => {
    try {
      const status = await getVaultBridge().getStatus();
      set({ status, initialized: true, errorMessage: null });
    } catch (err) {
      set({
        initialized: true,
        errorMessage: err instanceof Error ? err.message : 'Failed to load vault status',
      });
    }
  },

  setupVault: async (masterPassword) => {
    const result = await getVaultBridge().setupVault(masterPassword);
    set({
      status: result.status,
      vaultData: result.vaultData,
      pendingRecoveryPhrase: result.recoveryPhrase,
      selectedNodeId: null,
      isDirty: false,
      errorMessage: null,
      saveState: 'saved',
    });
  },

  acknowledgeRecoveryPhrase: () => {
    set({ pendingRecoveryPhrase: null });
  },

  unlockVault: async (masterPassword) => {
    const result = await getVaultBridge().unlockVault(masterPassword);
    const firstId = result.vaultData.nodes[0]?.id ?? null;
    set({
      status: result.status,
      vaultData: result.vaultData,
      selectedNodeId: firstId,
      isDirty: false,
      errorMessage: null,
      saveState: 'idle',
    });
  },

  lockVault: async () => {
    if (activeSavePromise) {
      await activeSavePromise;
    }
    const status = await getVaultBridge().lockVault();
    set({
      status,
      vaultData: null,
      selectedNodeId: null,
      searchQuery: '',
      isDirty: false,
      pendingRecoveryPhrase: null,
      saveState: 'idle',
    });
  },

  recoverVault: async (recoveryPhrase, newMasterPassword, regenerate = false) => {
    const result = await getVaultBridge().recoverVault(
      recoveryPhrase,
      newMasterPassword,
      regenerate,
    );
    const firstId = result.vaultData.nodes[0]?.id ?? null;
    set({
      status: result.status,
      vaultData: result.vaultData,
      selectedNodeId: firstId,
      isDirty: false,
      pendingRecoveryPhrase: result.newRecoveryPhrase ?? null,
      errorMessage: null,
      saveState: 'saved',
    });
  },

  changePassword: async (currentPassword, newPassword) => {
    const status = await getVaultBridge().changePassword(currentPassword, newPassword);
    set({ status, errorMessage: null });
  },

  selectNode: (nodeId) => {
    const { isDirty, selectedNodeId, t } = get();
    if (isDirty && nodeId !== selectedNodeId) {
      if (!window.confirm(t('unsavedChangesConfirm'))) {
        return;
      }
    }
    set({ selectedNodeId: nodeId, isDirty: false });
  },

  toggleExpand: (nodeId) =>
    set((state) => ({
      expandedNodeIds: {
        ...state.expandedNodeIds,
        [nodeId]: !state.expandedNodeIds[nodeId],
      },
    })),

  expandAll: () => {
    const { vaultData } = get();
    if (!vaultData) return;
    set({ expandedNodeIds: collectAllNodeIds(vaultData.nodes) });
  },

  collapseAll: () => set({ expandedNodeIds: {} }),

  addNode: async (parentId, title, image) => {
    const { vaultData, expandedNodeIds, isDirty, t } = get();
    if (!vaultData) return null;

    if (isDirty && !window.confirm(t('unsavedChangesConfirm'))) {
      return null;
    }

    const newNode = createVaultNode({
      parentId,
      title,
      image: image ?? { type: 'preset', value: parentId ? 'key' : 'folder' },
      pairs: parentId
        ? [createKeyValuePair('ID', '', false), createKeyValuePair('Password', '', true)]
        : [],
    });

    const nextNodes = addNodeToTree(vaultData.nodes, parentId, newNode);
    const nextVault: VaultData = {
      ...vaultData,
      nodes: nextNodes,
      updatedAt: new Date().toISOString(),
    };

    const nextExpanded = parentId
      ? { ...expandedNodeIds, [parentId]: true }
      : expandedNodeIds;

    set({
      vaultData: nextVault,
      selectedNodeId: newNode.id,
      expandedNodeIds: nextExpanded,
      isDirty: false,
      saveState: 'saving',
    });

    await persistVault(nextVault, set, t);
    return newNode.id;
  },

  updateNode: async (nodeId, patch) => {
    const { vaultData, t } = get();
    if (!vaultData) return;

    const nextNodes = updateNodeInTree(vaultData.nodes, nodeId, patch);
    const nextVault: VaultData = {
      ...vaultData,
      nodes: nextNodes,
      updatedAt: new Date().toISOString(),
    };

    set({ vaultData: nextVault, isDirty: false, saveState: 'saving' });
    await persistVault(nextVault, set, t);
  },

  deleteNode: async (nodeId) => {
    const { vaultData, selectedNodeId, t } = get();
    if (!vaultData) return;

    const nextNodes = deleteNodeFromTree(vaultData.nodes, nodeId);
    const nextVault: VaultData = {
      ...vaultData,
      nodes: nextNodes,
      updatedAt: new Date().toISOString(),
    };

    set({
      vaultData: nextVault,
      selectedNodeId:
        selectedNodeId === nodeId ? (nextNodes[0]?.id ?? null) : selectedNodeId,
      isDirty: false,
      saveState: 'saving',
    });

    await persistVault(nextVault, set, t);
  },

  copySensitive: async (text) => {
    await getVaultBridge().writeSensitiveClipboard(text);
  },
}));
