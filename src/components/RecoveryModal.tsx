import { useState } from 'react';
import { AlertTriangle, Check, Copy, ShieldAlert } from 'lucide-react';
import { formatRecoveryPhraseGrid } from '../core/recoveryFormat.ts';
import { useVaultStore } from '../storage/useVaultStore.ts';

export function RecoveryModal() {
  const pendingRecoveryPhrase = useVaultStore((s) => s.pendingRecoveryPhrase);
  const acknowledgeRecoveryPhrase = useVaultStore(
    (s) => s.acknowledgeRecoveryPhrase,
  );
  const copySensitive = useVaultStore((s) => s.copySensitive);
  const t = useVaultStore((s) => s.t);

  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!pendingRecoveryPhrase) {
    return null;
  }

  const words = pendingRecoveryPhrase.split(' ');

  const handleCopy = async () => {
    await copySensitive(formatRecoveryPhraseGrid(pendingRecoveryPhrase, 3));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-lg w-full rounded-2xl bg-slate-900 border border-amber-500/40 p-6 shadow-2xl space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              {t('recoveryIssuedTitle')}
            </h2>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              {t('recoveryIssuedWarning')}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              {t('recoveryPhraseLabel')}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t('copiedToast') : t('copyRecoveryPhrase')}
            </button>
          </div>

          <div
            data-testid="recovery-phrase-grid"
            className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800"
          >
            {words.map((word, idx) => (
              <div
                key={`${word}-${idx}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800/80 text-xs font-mono"
              >
                <span className="text-slate-500 select-none w-4 text-right">
                  {idx + 1}.
                </span>
                <span className="text-slate-100 font-semibold">{word}</span>
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 accent-indigo-500"
          />
          <span className="text-xs text-slate-200 leading-relaxed">
            {t('recoveryConfirmCheckbox')}
          </span>
        </label>

        <button
          type="button"
          disabled={!confirmed}
          onClick={acknowledgeRecoveryPhrase}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          {t('recoveryContinueButton')}
        </button>
      </div>
    </div>
  );
}
