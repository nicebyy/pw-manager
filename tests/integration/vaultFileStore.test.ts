import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VaultFileStore } from '../../electron/vaultFileStore.ts';
import { VaultCryptoError } from '../../src/core/crypto.ts';
import {
  addNodeToTree,
  createEmptyVaultData,
  createKeyValuePair,
  createVaultNode,
} from '../../src/core/tree.ts';

describe('VaultFileStore integration (encrypted disk persistence)', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pw-manager-test-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('persists multi-level tree, images, and key-value pairs encrypted on disk and supports recovery', async () => {
    const store = new VaultFileStore(tempDir);
    expect((await store.getStatus()).state).toBe('uninitialized');

    const setupResult = await store.setup('InitialMaster!99');
    expect(setupResult.status.state).toBe('unlocked');
    expect(setupResult.recoveryPhrase.split(' ')).toHaveLength(12);

    const folder = createVaultNode({
      title: 'Dev Accounts',
      image: { type: 'preset', value: 'folder' },
    });
    const github = createVaultNode({
      parentId: folder.id,
      title: 'GitHub',
      image: { type: 'custom', value: 'data:image/png;base64,iVBORw0KGgo=' },
      pairs: [
        createKeyValuePair('ID', 'dev-user', false),
        createKeyValuePair('PAT', 'ghp_very_secret_token', true),
      ],
    });

    const data = createEmptyVaultData();
    data.nodes = addNodeToTree(data.nodes, null, folder);
    data.nodes = addNodeToTree(data.nodes, folder.id, github);

    await store.save(data);
    store.lock();
    expect((await store.getStatus()).state).toBe('locked');

    // Verify disk file does not contain any plaintext secrets
    const diskContent = await fs.readFile(path.join(tempDir, 'vault.pwmgr'), 'utf8');
    expect(diskContent).not.toContain('ghp_very_secret_token');
    expect(diskContent).not.toContain('Dev Accounts');
    expect(diskContent).not.toContain('InitialMaster!99');

    // Re-open with a fresh VaultFileStore instance
    const reopenedStore = new VaultFileStore(tempDir);
    await expect(reopenedStore.unlock('WrongPassword!')).rejects.toThrow(
      VaultCryptoError,
    );

    const unlocked = await reopenedStore.unlock('InitialMaster!99');
    expect(unlocked.vaultData.nodes).toHaveLength(1);
    expect(unlocked.vaultData.nodes[0].children[0].title).toBe('GitHub');
    expect(unlocked.vaultData.nodes[0].children[0].image?.type).toBe('custom');
    expect(unlocked.vaultData.nodes[0].children[0].pairs[1].value).toBe(
      'ghp_very_secret_token',
    );
    reopenedStore.lock();

    // Recover using the 12-word phrase
    const recovered = await reopenedStore.recover(
      setupResult.recoveryPhrase,
      'RecoveredMaster!2026',
    );
    expect(recovered.vaultData.nodes[0].children[0].title).toBe('GitHub');
    reopenedStore.lock();

    await expect(reopenedStore.unlock('InitialMaster!99')).rejects.toThrow(
      VaultCryptoError,
    );
    const unlockedAfterRecovery = await reopenedStore.unlock('RecoveredMaster!2026');
    expect(unlockedAfterRecovery.status.state).toBe('unlocked');
    reopenedStore.lock();
  });

  it('serializes concurrent save() calls without file collision or corruption', async () => {
    const store = new VaultFileStore(tempDir);
    await store.setup('Concurrent!2026');

    const saves = Array.from({ length: 5 }, (_, idx) => {
      const data = createEmptyVaultData();
      data.nodes = addNodeToTree(
        data.nodes,
        null,
        createVaultNode({ title: `Item-${idx}` }),
      );
      return store.save(data);
    });

    await Promise.all(saves);
    store.lock();

    const reopened = new VaultFileStore(tempDir);
    const unlocked = await reopened.unlock('Concurrent!2026');
    expect(unlocked.vaultData.nodes).toHaveLength(1);
    expect(unlocked.vaultData.nodes[0].title).toBe('Item-4');
    reopened.lock();
  });

  it('throws VaultCryptoError when vault file JSON is corrupted', async () => {
    const store = new VaultFileStore(tempDir);
    await store.setup('CorruptTest!2026');
    store.lock();

    await fs.writeFile(path.join(tempDir, 'vault.pwmgr'), '{corrupted-json', 'utf8');
    await expect(store.unlock('CorruptTest!2026')).rejects.toThrow(VaultCryptoError);
  });
});
