import { describe, expect, it } from 'vitest';
import {
  changeMasterPassword,
  createEncryptedVault,
  formatRecoveryPhraseGrid,
  generateRecoveryPhrase,
  normalizeRecoveryPhrase,
  recoverVaultWithPhrase,
  saveVaultWithDek,
  unlockVaultWithPassword,
  VaultCryptoError,
  zeroizeBuffer,
} from '../../src/core/crypto.ts';
import {
  addNodeToTree,
  createEmptyVaultData,
  createKeyValuePair,
  createVaultNode,
} from '../../src/core/tree.ts';

describe('crypto engine (scrypt + AES-256-GCM Dual-Key Envelope)', () => {
  it('encrypts vault with master password seed and decrypts with the same password', async () => {
    const initial = createEmptyVaultData();
    const node = createVaultNode({
      title: 'GitHub',
      image: { type: 'preset', value: 'github' },
      pairs: [createKeyValuePair('Token', 'ghp_super_secret_123', true)],
    });
    initial.nodes = addNodeToTree(initial.nodes, null, node);

    const { envelope, recoveryPhrase, dek } = await createEncryptedVault(
      'MasterPass!2026',
      initial,
    );

    expect(recoveryPhrase.split(' ')).toHaveLength(12);
    const serialized = JSON.stringify(envelope);
    expect(serialized).not.toContain('ghp_super_secret_123');
    expect(serialized).not.toContain('MasterPass!2026');
    expect(serialized).not.toContain(recoveryPhrase);

    zeroizeBuffer(dek);

    const unlocked = await unlockVaultWithPassword(envelope, 'MasterPass!2026');
    expect(unlocked.vaultData.nodes).toHaveLength(1);
    expect(unlocked.vaultData.nodes[0].pairs[0].value).toBe('ghp_super_secret_123');
    zeroizeBuffer(unlocked.dek);
  });

  it('rejects wrong master password and tampered ciphertext', async () => {
    const { envelope, dek } = await createEncryptedVault(
      'CorrectPass123',
      createEmptyVaultData(),
    );
    zeroizeBuffer(dek);

    await expect(
      unlockVaultWithPassword(envelope, 'WrongPass123'),
    ).rejects.toThrow(VaultCryptoError);

    const tampered = {
      ...envelope,
      payload: {
        ...envelope.payload,
        ciphertext: Buffer.from('tampered-bytes').toString('base64'),
      },
    };
    await expect(
      unlockVaultWithPassword(tampered, 'CorrectPass123'),
    ).rejects.toThrow(VaultCryptoError);
  });

  it('recovers vault using normalized recovery phrase and permanently blocks wrong phrases', async () => {
    const initial = createEmptyVaultData();
    initial.nodes = addNodeToTree(
      initial.nodes,
      null,
      createVaultNode({
        title: 'Discord',
        pairs: [createKeyValuePair('Email', 'user@example.com', false)],
      }),
    );

    const { envelope, recoveryPhrase, dek } = await createEncryptedVault(
      'OldPassword123',
      initial,
    );
    zeroizeBuffer(dek);

    await expect(
      recoverVaultWithPhrase(envelope, 'wrong phrase words here', 'NewPassword456'),
    ).rejects.toThrow(VaultCryptoError);

    const messyPhrase = `  ${recoveryPhrase.toUpperCase().replace(/ /g, '   ')}  `;
    const recovered = await recoverVaultWithPhrase(
      envelope,
      messyPhrase,
      'NewPassword456',
      true,
    );

    expect(recovered.vaultData.nodes[0].title).toBe('Discord');
    expect(recovered.newRecoveryPhrase).toBeDefined();
    expect(recovered.newRecoveryPhrase).not.toBe(recoveryPhrase);
    zeroizeBuffer(recovered.dek);

    await expect(
      unlockVaultWithPassword(recovered.envelope, 'OldPassword123'),
    ).rejects.toThrow(VaultCryptoError);

    const unlockedWithNew = await unlockVaultWithPassword(
      recovered.envelope,
      'NewPassword456',
    );
    expect(unlockedWithNew.vaultData.nodes[0].pairs[0].value).toBe('user@example.com');
    zeroizeBuffer(unlockedWithNew.dek);
  });

  it('supports saving updated vault data and changing master password', async () => {
    const { envelope, dek } = await createEncryptedVault(
      'FirstPass123',
      createEmptyVaultData(),
    );

    const updatedData = createEmptyVaultData();
    updatedData.nodes = addNodeToTree(
      updatedData.nodes,
      null,
      createVaultNode({ title: 'AWS Root' }),
    );

    const savedEnvelope = saveVaultWithDek(envelope, dek, updatedData);
    zeroizeBuffer(dek);

    const changed = await changeMasterPassword(
      savedEnvelope,
      'FirstPass123',
      'SecondPass456',
    );
    zeroizeBuffer(changed.dek);

    const unlocked = await unlockVaultWithPassword(
      changed.envelope,
      'SecondPass456',
    );
    expect(unlocked.vaultData.nodes[0].title).toBe('AWS Root');
    zeroizeBuffer(unlocked.dek);
  });

  it('generates recovery phrases with 12 unique words and formats/parses 4x3 row-col grid', () => {
    for (let i = 0; i < 20; i++) {
      const phrase = generateRecoveryPhrase(12);
      const words = phrase.split(' ');
      expect(words).toHaveLength(12);
      expect(new Set(words).size).toBe(12);
    }

    const sample =
      'acorn agent agile alarm album alert algae alien alley alloy almond alpha';
    const grid = formatRecoveryPhraseGrid(sample, 3);
    const lines = grid.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0].trim().split(/\s+/)).toEqual(['acorn', 'agent', 'agile']);
    expect(lines[3].trim().split(/\s+/)).toEqual(['alloy', 'almond', 'alpha']);
    expect(normalizeRecoveryPhrase(grid)).toBe(sample);
    expect(normalizeRecoveryPhrase('1. Acorn  2. Agent\n3. Agile')).toBe(
      'acorn agent agile',
    );
  });
});
