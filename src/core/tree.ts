import { CRYPTO_CONFIG } from '../constants/crypto.js';
import type { KeyValuePair, NodeImage, VaultData, VaultNode } from '../types/vault.js';

function generateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyVaultData(): VaultData {
  return {
    version: CRYPTO_CONFIG.VAULT_FORMAT_VERSION,
    nodes: [],
    updatedAt: new Date().toISOString(),
  };
}

export interface CreateNodeInput {
  parentId?: string | null;
  title: string;
  description?: string;
  image?: NodeImage;
  pairs?: Array<Omit<KeyValuePair, 'id'> & { id?: string }>;
}

export function createVaultNode(input: CreateNodeInput): VaultNode {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    parentId: input.parentId ?? null,
    title: input.title.trim(),
    description: input.description,
    image: input.image,
    pairs: (input.pairs ?? []).map((p) => ({
      id: p.id ?? generateId(),
      key: p.key,
      value: p.value,
      isSecret: p.isSecret,
    })),
    children: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createKeyValuePair(
  key: string,
  value: string,
  isSecret = true,
): KeyValuePair {
  return {
    id: generateId(),
    key,
    value,
    isSecret,
  };
}

export function findNodeById(nodes: VaultNode[], id: string): VaultNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findNodeById(node.children, id);
    if (found) {
      return found;
    }
  }
  return null;
}

export function getNodeBreadcrumbs(nodes: VaultNode[], targetId: string): VaultNode[] {
  for (const node of nodes) {
    if (node.id === targetId) {
      return [node];
    }
    const childPath = getNodeBreadcrumbs(node.children, targetId);
    if (childPath.length > 0) {
      return [node, ...childPath];
    }
  }
  return [];
}

export function addNodeToTree(
  nodes: VaultNode[],
  parentId: string | null,
  newNode: VaultNode,
): VaultNode[] {
  if (parentId === null) {
    return [...nodes, { ...newNode, parentId: null }];
  }

  let inserted = false;
  const next = nodes.map((node) => {
    if (node.id === parentId) {
      inserted = true;
      return {
        ...node,
        updatedAt: new Date().toISOString(),
        children: [...node.children, { ...newNode, parentId }],
      };
    }
    if (node.children.length > 0) {
      const updatedChildren = addNodeToTree(node.children, parentId, newNode);
      if (updatedChildren !== node.children) {
        inserted = true;
        return { ...node, children: updatedChildren };
      }
    }
    return node;
  });

  return inserted ? next : nodes;
}

export function updateNodeInTree(
  nodes: VaultNode[],
  id: string,
  patch: Partial<Pick<VaultNode, 'title' | 'description' | 'image' | 'pairs'>>,
): VaultNode[] {
  let changed = false;
  const next = nodes.map((node) => {
    if (node.id === id) {
      changed = true;
      return {
        ...node,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
    }
    if (node.children.length > 0) {
      const updatedChildren = updateNodeInTree(node.children, id, patch);
      if (updatedChildren !== node.children) {
        changed = true;
        return { ...node, children: updatedChildren };
      }
    }
    return node;
  });

  return changed ? next : nodes;
}

export function deleteNodeFromTree(nodes: VaultNode[], id: string): VaultNode[] {
  let changed = false;
  const filtered: VaultNode[] = [];

  for (const node of nodes) {
    if (node.id === id) {
      changed = true;
      continue;
    }
    if (node.children.length > 0) {
      const updatedChildren = deleteNodeFromTree(node.children, id);
      if (updatedChildren !== node.children) {
        changed = true;
        filtered.push({ ...node, children: updatedChildren });
        continue;
      }
    }
    filtered.push(node);
  }

  return changed ? filtered : nodes;
}

function nodeMatchesQuery(node: VaultNode, lowerQuery: string): boolean {
  if (node.title.toLowerCase().includes(lowerQuery)) return true;
  if (node.description && node.description.toLowerCase().includes(lowerQuery)) return true;
  return node.pairs.some(
    (p) =>
      p.key.toLowerCase().includes(lowerQuery) ||
      (!p.isSecret && p.value.toLowerCase().includes(lowerQuery)),
  );
}

/**
 * Filters the multi-level tree by query, preserving ancestor nodes of matching descendants
 * so the hierarchical context remains visible.
 */
export function filterTreeByQuery(nodes: VaultNode[], query: string): VaultNode[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return nodes;

  const result: VaultNode[] = [];
  for (const node of nodes) {
    const filteredChildren = filterTreeByQuery(node.children, trimmed);
    if (nodeMatchesQuery(node, trimmed) || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: filteredChildren,
      });
    }
  }
  return result;
}

export function countTreeStats(nodes: VaultNode[]): {
  totalNodes: number;
  totalPairs: number;
} {
  let totalNodes = 0;
  let totalPairs = 0;

  for (const node of nodes) {
    totalNodes += 1;
    totalPairs += node.pairs.length;
    if (node.children.length > 0) {
      const childStats = countTreeStats(node.children);
      totalNodes += childStats.totalNodes;
      totalPairs += childStats.totalPairs;
    }
  }

  return { totalNodes, totalPairs };
}
