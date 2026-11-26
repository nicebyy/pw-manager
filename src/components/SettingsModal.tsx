import { useState } from 'react';
import { X } from 'lucide-react';
import { SECURITY_DEFAULTS } from '../constants/app.ts';
import { useVaultStore } from '../storage/useVaultStore.ts';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const language = useVaultStore((s) => s.language);
  const setLanguage = useVaultStore((s) => s.setLanguage);
  const autoLockMinutes = useVaultStore((s) => s.autoLockMinutes);
  const setAutoLockMinutes = useVaultStore((s) => s.setAutoLockMinutes);
  const status = useVaultStore((s) => s.status);
  const changePassword = useVaultStore((s) => s.changePassword);
  const t = useVaultStore((s) => s.t);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPw.length < SECURITY_DEFAULTS.MIN_MASTER_PASSWORD_LENGTH) {
      setMsg({
        type: 'error',
        text: t('passwordTooShortError', {
          min: SECURITY_DEFAULTS.MIN_MASTER_PASSWORD_LENGTH,
        }),
      });
      return;
    }
    if (newPw !== confirmPw) {
      setMsg({ type: 'error', text: t('passwordMismatchError') });
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPw, newPw);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setMsg({ type: 'success', text: t('passwordChangedSuccess') });
    } catch {
      setMsg({ type: 'error', text: t('unlockFailedError') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">{t('settingsTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Language Switcher */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400">
            {t('languageLabel')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLanguage('ko')}
              className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                language === 'ko'
                  ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('languageKo')}
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                language === 'en'
                  ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('languageEn')}
            </button>
          </div>
        </div>

        {/* Auto-Lock on Inactivity */}
        <div className="space-y-1.5">
          <label
            htmlFor="auto-lock-select"
            className="block text-xs font-medium text-slate-400"
          >
            {t('autoLockLabel')}
          </label>
          <select
            id="auto-lock-select"
            value={autoLockMinutes}
            onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value={0}>{t('autoLockOff')}</option>
            <option value={5}>{t('autoLockMinutes', { minutes: 5 })}</option>
            <option value={10}>{t('autoLockMinutes', { minutes: 10 })}</option>
            <option value={15}>{t('autoLockMinutes', { minutes: 15 })}</option>
            <option value={30}>{t('autoLockMinutes', { minutes: 30 })}</option>
          </select>
        </div>

        {/* Change Master Password */}
        <form onSubmit={handleChangePassword} className="space-y-2.5 pt-3 border-t border-slate-800">
          <h3 className="text-xs font-semibold text-slate-300">
            {t('changePasswordTitle')}
          </h3>
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder={t('currentPasswordLabel')}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder={t('newMasterPasswordLabel')}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder={t('confirmPasswordLabel')}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
          />
          {msg && (
            <p
              className={`text-xs ${
                msg.type === 'error' ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {msg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          >
            {t('changePasswordButton')}
          </button>
        </form>

        {/* Vault Metadata */}
        <div className="pt-3 border-t border-slate-800 space-y-2 text-[11px] text-slate-400">
          <div>
            <span className="font-semibold text-slate-300">{t('encryptionSpecLabel')}: </span>
            <span>{t('encryptionSpecValue')}</span>
          </div>
          {status.vaultPath && (
            <div className="break-all">
              <span className="font-semibold text-slate-300">{t('vaultLocationLabel')}: </span>
              <span className="font-mono">{status.vaultPath}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
