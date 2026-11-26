import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FolderPlus,
  ImagePlus,
  KeyRound,
  Lock,
  Plus,
  Save,
  Trash2,
  Unlock,
  Wand2,
  X,
} from 'lucide-react';
import { SERVICE_ICON_PRESETS } from '../constants/presets.ts';
import { generateStrongPassword } from '../core/passwordGenerator.ts';
import {
  countTreeStats,
  createKeyValuePair,
  findNodeById,
  getNodeBreadcrumbs,
} from '../core/tree.ts';
import { useVaultStore } from '../storage/useVaultStore.ts';
import type { KeyValuePair, NodeImage } from '../types/vault.ts';
import { resizeImageFileToDataUrl } from '../utils/imageResize.ts';
import { NodeIcon } from './NodeIcon.tsx';

export function NodeDetail() {
  const vaultData = useVaultStore((s) => s.vaultData);
  const selectedNodeId = useVaultStore((s) => s.selectedNodeId);
  const selectNode = useVaultStore((s) => s.selectNode);
  const addNode = useVaultStore((s) => s.addNode);
  const updateNode = useVaultStore((s) => s.updateNode);
  const deleteNode = useVaultStore((s) => s.deleteNode);
  const copySensitive = useVaultStore((s) => s.copySensitive);
  const saveState = useVaultStore((s) => s.saveState);
  const errorMessage = useVaultStore((s) => s.errorMessage);
  const isDirty = useVaultStore((s) => s.isDirty);
  const setDirty = useVaultStore((s) => s.setDirty);
  const t = useVaultStore((s) => s.t);

  const node =
    vaultData && selectedNodeId ? findNodeById(vaultData.nodes, selectedNodeId) : null;
  const breadcrumbs =
    vaultData && selectedNodeId ? getNodeBreadcrumbs(vaultData.nodes, selectedNodeId) : [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<NodeImage | undefined>(undefined);
  const [pairs, setPairs] = useState<KeyValuePair[]>([]);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setIsDirty = (dirty: boolean) => {
    setDirty(dirty);
  };

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setDescription(node.description ?? '');
      setImage(node.image);
      setPairs(node.pairs);
      setRevealedIds({});
      setImageError(null);
      setIsDraggingImage(false);
      setDirty(false);
    }
  }, [node?.id]);

  const handleSave = async () => {
    if (!node) return;
    await updateNode(node.id, {
      title: title.trim() || node.title,
      description: description.trim() || undefined,
      image,
      pairs,
    });
  };

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    setImageError(null);
    try {
      const dataUrl = await resizeImageFileToDataUrl(file);
      const nextImage: NodeImage = { type: 'custom', value: dataUrl };
      setImage(nextImage);
      setIsDirty(true);
    } catch {
      setImageError(t('imageTooLargeError'));
    }
  };

  useEffect(() => {
    if (!node) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void processImageFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('paste', onPaste);
    };
  });

  if (!node) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-indigo-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-400">{t('selectNodePrompt')}</p>
        </div>
      </div>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await processImageFile(file);
    } finally {
      e.target.value = '';
    }
  };

  const handleAddPair = () => {
    setPairs((prev) => [...prev, createKeyValuePair('', '', true)]);
    setIsDirty(true);
  };

  const handlePairChange = (
    pairId: string,
    patch: Partial<Pick<KeyValuePair, 'key' | 'value' | 'isSecret'>>,
  ) => {
    setPairs((prev) =>
      prev.map((p) => (p.id === pairId ? { ...p, ...patch } : p)),
    );
    setIsDirty(true);
  };

  const handleDeletePair = (pairId: string) => {
    setPairs((prev) => prev.filter((p) => p.id !== pairId));
    setIsDirty(true);
  };

  const handleCopy = async (pair: KeyValuePair) => {
    await copySensitive(pair.value);
    setCopiedId(pair.id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === pair.id ? null : curr));
    }, 1800);
  };

  const handleDeleteNode = async () => {
    const childCount = countTreeStats(node.children).totalNodes;
    const message =
      childCount > 0
        ? t('deleteNodeConfirm', { count: childCount })
        : t('deleteNodeConfirmSingle', { title: node.title });
    if (!window.confirm(message)) return;
    await deleteNode(node.id);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
            {breadcrumbs.map((crumb, idx) => (
              <span key={crumb.id} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                <button
                  type="button"
                  onClick={() => selectNode(crumb.id)}
                  className={`hover:text-indigo-300 transition-colors ${
                    idx === breadcrumbs.length - 1 ? 'text-slate-200 font-medium' : ''
                  }`}
                >
                  {crumb.title}
                </button>
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {copiedId && (
              <span className="text-xs text-emerald-400">
                {t('copiedClipboardNotice')}
              </span>
            )}
            <span
              className={`text-xs ${
                saveState === 'error'
                  ? 'text-rose-400'
                  : isDirty
                    ? 'text-amber-400'
                    : 'text-slate-400'
              }`}
            >
              {saveState === 'error'
                ? errorMessage || t('saveFailedError')
                : isDirty
                  ? t('unsavedChanges')
                  : saveState === 'saving'
                    ? t('savingIndicator')
                    : t('savedIndicator')}
            </span>
            <button
              type="button"
              onClick={handleSave}
              title="Ctrl+S"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {t('saveChangesButton')}
            </button>
          </div>
        </div>

        {/* Header + Image Section */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-start gap-4">
            <NodeIcon
              image={image}
              title={title || node.title}
              hasChildren={node.children.length > 0}
              size="lg"
            />
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {t('titleLabel')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder={t('titlePlaceholder')}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {t('descriptionLabel')}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder={t('descriptionPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Image Upload, Drag & Drop, Paste & Presets */}
          <div
            data-testid="image-dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingImage(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDraggingImage(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingImage(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                void processImageFile(file);
              }
            }}
            className={`pt-3 border-t border-slate-800/80 space-y-2.5 rounded-xl transition-colors ${
              isDraggingImage
                ? 'p-3 bg-indigo-500/10 border border-dashed border-indigo-400'
                : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-xs font-medium text-slate-400 block">
                  {t('imageSectionTitle')}
                </span>
                <span className="text-[11px] text-slate-500">
                  {t('dragDropOrPasteHint')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  {t('uploadImageButton')}
                </button>
                {image && (
                  <button
                    type="button"
                    onClick={() => {
                      setImage(undefined);
                      setIsDirty(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 text-xs transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t('removeImageButton')}
                  </button>
                )}
              </div>
            </div>

            {imageError && (
              <p className="text-xs text-rose-400">{imageError}</p>
            )}

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 mr-1">
                {t('presetIconsLabel')}:
              </span>
              {SERVICE_ICON_PRESETS.map((preset) => {
                const active = image?.type === 'preset' && image.value === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setImage({ type: 'preset', value: preset.id });
                      setIsDirty(true);
                    }}
                    title={preset.label}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold text-white transition-all ${
                      active ? 'ring-2 ring-indigo-400 scale-105' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: preset.color }}
                  >
                    {preset.shortText}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Key-Value Pairs Section */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              {t('pairsSectionTitle')}
            </h3>
            <button
              type="button"
              onClick={handleAddPair}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('addPairButton')}
            </button>
          </div>

          <div className="space-y-2">
            {pairs.map((pair) => {
              const isRevealed = Boolean(revealedIds[pair.id]);
              const isMasked = pair.isSecret && !isRevealed;
              return (
                <div
                  key={pair.id}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800/90"
                >
                  <input
                    type="text"
                    value={pair.key}
                    onChange={(e) =>
                      handlePairChange(pair.id, { key: e.target.value })
                    }
                    placeholder={t('keyPlaceholder')}
                    className="w-40 shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />

                  <input
                    type={isMasked ? 'password' : 'text'}
                    value={pair.value}
                    onChange={(e) =>
                      handlePairChange(pair.id, { value: e.target.value })
                    }
                    placeholder={t('valuePlaceholder')}
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      handlePairChange(pair.id, { isSecret: !pair.isSecret })
                    }
                    title={t('secretToggleTooltip')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      pair.isSecret
                        ? 'text-amber-400 hover:bg-slate-800'
                        : 'text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    {pair.isSecret ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Unlock className="w-4 h-4" />
                    )}
                  </button>

                  {pair.isSecret && (
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedIds((prev) => ({
                          ...prev,
                          [pair.id]: !prev[pair.id],
                        }))
                      }
                      title={t('revealValueTooltip')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      {isRevealed ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      handlePairChange(pair.id, {
                        value: generateStrongPassword(),
                        isSecret: true,
                      })
                    }
                    title={t('generatePasswordTooltip')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(pair)}
                    title={t('copyValueTooltip')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors"
                  >
                    {copiedId === pair.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePair(pair.id)}
                    title={t('deletePairTooltip')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => addNode(node.id, t('addChildNode'))}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            {t('addChildNode')}
          </button>

          <button
            type="button"
            onClick={handleDeleteNode}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-900/60 text-rose-300 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('deleteNodeButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
