import { useEffect, useState } from 'react';
import { Lock, Settings, Shield } from 'lucide-react';
import { NodeDetail } from '../components/NodeDetail.tsx';
import { RecoveryModal } from '../components/RecoveryModal.tsx';
import { SettingsModal } from '../components/SettingsModal.tsx';
import { TreeSidebar } from '../components/TreeSidebar.tsx';
import { useVaultStore } from '../storage/useVaultStore.ts';

export function VaultView() {
  const lockVault = useVaultStore((s) => s.lockVault);
  const autoLockMinutes = useVaultStore((s) => s.autoLockMinutes);
  const t = useVaultStore((s) => s.t);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (autoLockMinutes <= 0) return;

    const timeoutMs = autoLockMinutes * 60_000;
    let timer = setTimeout(() => {
      void lockVault();
    }, timeoutMs);

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void lockVault();
      }, timeoutMs);
    };

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'keydown',
      'mousedown',
      'touchstart',
    ];
    for (const ev of events) {
      window.addEventListener(ev, resetTimer, { passive: true });
    }

    return () => {
      clearTimeout(timer);
      for (const ev of events) {
        window.removeEventListener(ev, resetTimer);
      }
    };
  }, [autoLockMinutes, lockVault]);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="h-12 shrink-0 px-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight">{t('appName')}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            {t('settings')}
          </button>
          <button
            type="button"
            onClick={lockVault}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/70 text-slate-200 hover:text-rose-200 text-xs font-medium transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            {t('lockVault')}
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <TreeSidebar />
        <NodeDetail />
      </div>

      <RecoveryModal />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
