import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderPlus,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { countTreeStats, filterTreeByQuery } from '../core/tree.ts';
import { useVaultStore } from '../storage/useVaultStore.ts';
import type { VaultNode } from '../types/vault.ts';
import { NodeIcon } from './NodeIcon.tsx';

interface TreeNodeRowProps {
  node: VaultNode;
  depth: number;
  forceExpand: boolean;
}

function TreeNodeRow({ node, depth, forceExpand }: TreeNodeRowProps) {
  const selectedNodeId = useVaultStore((s) => s.selectedNodeId);
  const expandedNodeIds = useVaultStore((s) => s.expandedNodeIds);
  const selectNode = useVaultStore((s) => s.selectNode);
  const toggleExpand = useVaultStore((s) => s.toggleExpand);
  const addNode = useVaultStore((s) => s.addNode);
  const t = useVaultStore((s) => s.t);

  const hasChildren = node.children.length > 0;
  const isExpanded = forceExpand || Boolean(expandedNodeIds[node.id]);
  const isSelected = selectedNodeId === node.id;

  const handleAddChild = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await addNode(node.id, t('addChildNode'));
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => selectNode(node.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectNode(node.id);
          }
        }}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        className={`group flex items-center gap-2 pr-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? 'bg-indigo-600/25 text-indigo-100 border border-indigo-500/40'
            : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(node.id);
          }}
          className={`w-4 h-4 flex items-center justify-center rounded hover:bg-slate-700/60 ${
            hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-label="toggle"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        <NodeIcon image={node.image} title={node.title} hasChildren={hasChildren} size="sm" />

        <span className="flex-1 truncate text-sm font-medium">{node.title}</span>

        {node.pairs.length > 0 && (
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 tabular-nums">
            {node.pairs.length}
          </span>
        )}

        <button
          type="button"
          onClick={handleAddChild}
          title={t('addChildNode')}
          aria-label={t('addChildNode')}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-indigo-300 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              forceExpand={forceExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeSidebar() {
  const vaultData = useVaultStore((s) => s.vaultData);
  const searchQuery = useVaultStore((s) => s.searchQuery);
  const setSearchQuery = useVaultStore((s) => s.setSearchQuery);
  const addNode = useVaultStore((s) => s.addNode);
  const expandAll = useVaultStore((s) => s.expandAll);
  const collapseAll = useVaultStore((s) => s.collapseAll);
  const t = useVaultStore((s) => s.t);

  const rawNodes = vaultData?.nodes ?? [];
  const filteredNodes = filterTreeByQuery(rawNodes, searchQuery);
  const stats = countTreeStats(rawNodes);
  const isSearching = searchQuery.trim().length > 0;

  return (
    <aside className="w-80 shrink-0 border-r border-slate-800 bg-slate-900/60 flex flex-col h-full">
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-8 pr-7 py-1.5 text-sm rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {isSearching && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title={t('clearSearch')}
                aria-label={t('clearSearch')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => addNode(null, t('addRootNode'))}
            title={t('addRootNode')}
            aria-label={t('addRootNode')}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shrink-0"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {rawNodes.length > 0 && (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={expandAll}
              title={t('expandAll')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <ChevronsUpDown className="w-3 h-3" />
              {t('expandAll')}
            </button>
            <button
              type="button"
              onClick={collapseAll}
              title={t('collapseAll')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <ChevronsDownUp className="w-3 h-3" />
              {t('collapseAll')}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filteredNodes.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-sm font-medium text-slate-400">{t('emptyTreeTitle')}</p>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {t('emptyTreeDescription')}
            </p>
          </div>
        ) : (
          filteredNodes.map((node) => (
            <TreeNodeRow
              key={node.id}
              node={node}
              depth={0}
              forceExpand={isSearching}
            />
          ))
        )}
      </div>

      <div className="px-3 py-2 border-t border-slate-800 text-xs text-slate-500">
        {t('statsSummary', { nodes: stats.totalNodes, pairs: stats.totalPairs })}
      </div>
    </aside>
  );
}
