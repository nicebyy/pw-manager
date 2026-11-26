import { useEffect, useState } from 'react';
import { useVaultStore } from './storage/useVaultStore.ts';
import { LoginView } from './views/LoginView.tsx';
import { RecoveryView } from './views/RecoveryView.tsx';
import { SetupView } from './views/SetupView.tsx';
import { VaultView } from './views/VaultView.tsx';

export function App() {
  const initialized = useVaultStore((s) => s.initialized);
  const status = useVaultStore((s) => s.status);
  const refreshStatus = useVaultStore((s) => s.refreshStatus);
  const t = useVaultStore((s) => s.t);

  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status.state !== 'locked') {
      setRecoveryMode(false);
    }
  }, [status.state]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        {t('loading')}
      </div>
    );
  }

  if (status.state === 'uninitialized') {
    return <SetupView />;
  }

  if (status.state === 'locked') {
    if (recoveryMode) {
      return <RecoveryView onBackToLogin={() => setRecoveryMode(false)} />;
    }
    return <LoginView onOpenRecovery={() => setRecoveryMode(true)} />;
  }

  return <VaultView />;
}

export default App;
