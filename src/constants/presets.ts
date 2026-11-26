export interface IconPreset {
  id: string;
  label: string;
  color: string;
  shortText: string;
}

export const SERVICE_ICON_PRESETS: readonly IconPreset[] = [
  { id: 'folder', label: 'Folder', color: '#6366f1', shortText: 'DIR' },
  { id: 'github', label: 'GitHub', color: '#1e293b', shortText: 'GH' },
  { id: 'discord', label: 'Discord', color: '#5865F2', shortText: 'DC' },
  { id: 'google', label: 'Google', color: '#ea4335', shortText: 'G' },
  { id: 'aws', label: 'AWS', color: '#f59e0b', shortText: 'AWS' },
  { id: 'naver', label: 'Naver', color: '#03c75a', shortText: 'N' },
  { id: 'kakao', label: 'Kakao', color: '#eab308', shortText: 'K' },
  { id: 'bank', label: 'Finance', color: '#0ea5e9', shortText: '$$' },
  { id: 'server', label: 'Server / SSH', color: '#10b981', shortText: 'SSH' },
  { id: 'key', label: 'API Key', color: '#ec4899', shortText: 'KEY' },
] as const;
