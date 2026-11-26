import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { SECURITY_DEFAULTS } from '../constants/app.ts';
import { useVaultStore } from '../storage/useVaultStore.ts';

interface RecoveryViewProps {
  onBackToLogin: () => void;
}

export function RecoveryView({ onBackToLogin }: RecoveryViewProps) {
  const recoverVault = useVaultStore((s) => s.recoverVault);
  const t = useVaultStore((s) => s.t);

  const [phrase, setPhrase] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [regenerate, setRegenerate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < SECURITY_DEFAULTS.MIN_MASTER_PASSWORD_LENGTH) {
      setError(
        t('passwordTooShortError', {
          min: SECURITY_DEFAULTS.MIN_MASTER_PASSWORD_LENGTH,
        }),
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatchError'));
      return;
    }

    setLoading(true);
    try {
      await recoverVault(phrase, newPassword, regenerate);
    } catch {
      setError(t('recoveryFailedError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="max-w-md w-full rounded-2xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">{t('recoveryTitle')}</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('recoveryDescription')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="recovery-phrase-input"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              {t('recoveryInputLabel')}
            </label>
            <textarea
              id="recovery-phrase-input"
              rows={4}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={t('recoveryInputPlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-mono whitespace-pre overflow-x-auto focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="recovery-new-password"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              {t('newMasterPasswordLabel')}
            </label>
            <input
              id="recovery-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('masterPasswordPlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="recovery-confirm-password"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              {t('confirmPasswordLabel')}
            </label>
            <input
              id="recovery-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('confirmPasswordPlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={regenerate}
              onChange={(e) => setRegenerate(e.target.checked)}
              className="accent-indigo-500"
            />
            {t('regeneratePhraseCheckbox')}
          </label>

          {error && (
            <p role="alert" className="text-xs text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !phrase.trim()}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {t('recoverButton')}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            {t('backToLogin')}
          </button>
        </div>
      </div>
    </div>
  );
}
