import { Folder, KeyRound } from 'lucide-react';
import { SERVICE_ICON_PRESETS } from '../constants/presets.ts';
import type { NodeImage } from '../types/vault.ts';

interface NodeIconProps {
  image?: NodeImage;
  title: string;
  hasChildren?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-[10px] rounded-md',
  md: 'w-8 h-8 text-xs rounded-lg',
  lg: 'w-14 h-14 text-sm rounded-xl',
} as const;

export function NodeIcon({
  image,
  title,
  hasChildren = false,
  size = 'sm',
}: NodeIconProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (image?.type === 'custom' && image.value) {
    return (
      <img
        src={image.value}
        alt={title}
        className={`${sizeClass} object-cover shrink-0 border border-slate-700/80 bg-slate-900`}
      />
    );
  }

  if (image?.type === 'preset') {
    const preset = SERVICE_ICON_PRESETS.find((p) => p.id === image.value);
    if (preset) {
      return (
        <span
          className={`${sizeClass} shrink-0 inline-flex items-center justify-center font-bold text-white shadow-sm select-none`}
          style={{ backgroundColor: preset.color }}
          aria-label={preset.label}
        >
          {preset.shortText}
        </span>
      );
    }
  }

  return (
    <span
      className={`${sizeClass} shrink-0 inline-flex items-center justify-center bg-slate-800 text-slate-300 border border-slate-700`}
    >
      {hasChildren ? (
        <Folder className={size === 'lg' ? 'w-6 h-6' : 'w-3.5 h-3.5'} />
      ) : (
        <KeyRound className={size === 'lg' ? 'w-6 h-6' : 'w-3.5 h-3.5'} />
      )}
    </span>
  );
}
