import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VaultFileStore } from '../../electron/vaultFileStore.ts';
import App from '../../src/App.tsx';
import { useVaultStore } from '../../src/storage/useVaultStore.ts';
import { setVaultBridgeOverride } from '../../src/storage/vaultClient.ts';

describe('App UI + VaultFileStore end-to-end integration', () => {
  let tempDir = '';
  let store: VaultFileStore;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pw-manager-ui-'));
    store = new VaultFileStore(tempDir);

    setVaultBridgeOverride({
      getStatus: () => store.getStatus(),
      setupVault: (pw) => store.setup(pw),
      unlockVault: (pw) => store.unlock(pw),
      lockVault: async () => {
        store.lock();
        return store.getStatus();
      },
      saveVault: (data) => store.save(data),
      recoverVault: (phrase, newPw, regen) => store.recover(phrase, newPw, regen),
      changePassword: (cur, next) => store.changePassword(cur, next),
      writeSensitiveClipboard: vi.fn(async () => {}),
      getAppVersion: async () => '1.0.0',
    });

    useVaultStore.setState({
      initialized: false,
      status: { state: 'locked', vaultPath: '' },
      vaultData: null,
      selectedNodeId: null,
      expandedNodeIds: {},
      searchQuery: '',
      language: 'ko',
      pendingRecoveryPhrase: null,
      saveState: 'idle',
      errorMessage: null,
    });
  });

  afterEach(async () => {
    store.lock();
    setVaultBridgeOverride(null);
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('completes Setup -> Recovery Phrase confirmation -> Add Node -> Lock -> Login flow', async () => {
    render(<App />);

    // 1. Setup View appears
    const pwInput = await screen.findByLabelText('마스터 비밀번호');
    const confirmInput = screen.getByLabelText('마스터 비밀번호 확인');
    fireEvent.change(pwInput, { target: { value: 'StrongMaster!2026' } });
    fireEvent.change(confirmInput, { target: { value: 'StrongMaster!2026' } });
    fireEvent.click(screen.getByRole('button', { name: '암호화 금고 생성' }));

    // 2. Recovery Phrase Modal appears with 12 words
    const phraseGrid = await screen.findByTestId('recovery-phrase-grid');
    expect(phraseGrid.children).toHaveLength(12);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    fireEvent.click(
      screen.getByRole('button', { name: '확인 완료, 금고 시작하기' }),
    );

    // 3. Inside VaultView: add a root node
    const addRootBtn = await screen.findByRole('button', { name: '새 최상위 항목' });
    fireEvent.click(addRootBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue('새 최상위 항목')).toBeInTheDocument();
      expect(screen.getByText('암호화 저장됨')).toBeInTheDocument();
    });

    // 4. Lock the vault
    fireEvent.click(screen.getByRole('button', { name: '금고 잠금' }));

    // 5. Login View appears -> unlock with Master Password
    const loginInput = await screen.findByLabelText('마스터 비밀번호');
    fireEvent.change(loginInput, { target: { value: 'StrongMaster!2026' } });
    fireEvent.click(screen.getByRole('button', { name: '잠금 해제' }));

    // 6. Saved node is restored after unlock
    await waitFor(() => {
      expect(screen.getByDisplayValue('새 최상위 항목')).toBeInTheDocument();
    });
  });
});
