import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useVaultStore } from '../storage/useVaultStore.ts';

interface LoginViewProps {
  onOpenRecovery: () => void;
}

export function LoginView({ onOpenRecovery }: LoginViewProps) {
  const unlockVault = useVaultStore((s) => s.unlockVault);
  const t = useVaultStore((s) => s.t);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await unlockVault(password);
    } catch {
      setError(t('unlockFailedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="max-w-md w-full rounded-2xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">{t('loginTitle')}</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('loginDescription')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              {t('masterPasswordLabel')}
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyEvent}
                onKeyUp={handleKeyEvent}
                placeholder={t('masterPasswordPlaceholder')}
                autoFocus
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={t('revealValueTooltip')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {capsLockOn && (
              <p className="text-[11px] text-amber-400 mt-1">{t('capsLockWarning')}</p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {t('unlockButton')}
          </button>
        </form>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onOpenRecovery}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-4"
          >
            {t('forgotPasswordLink')}
          </button>
        </div>
      </div>
    </div>
  );
}
