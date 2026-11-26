import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  changeMasterPassword,
  createEncryptedVault,
  recoverVaultWithPhrase,
  saveVaultWithDek,
  unlockVaultWithPassword,
  VaultCryptoError,
  zeroizeBuffer,
} from '../src/core/crypto.js';
import { createEmptyVaultData } from '../src/core/tree.js';
import {
  SECURITY_DEFAULTS,
  VAULT_BACKUP_FILE_NAME,
  VAULT_FILE_NAME,
} from '../src/constants/app.js';
import type {
  EncryptedVaultEnvelope,
  VaultData,
  VaultStatusInfo,
} from '../src/types/vault.js';
import type {
  RecoverVaultResult,
  SetupVaultResult,
  UnlockVaultResult,
} from '../src/types/ipc.js';

export class VaultFileStore {
  private readonly vaultDir: string;
  private readonly vaultPath: string;
  private readonly backupPath: string;

  private activeDek: Buffer | null = null;
  private activeEnvelope: EncryptedVaultEnvelope | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(vaultDir: string) {
    this.vaultDir = vaultDir;
    this.vaultPath = path.join(vaultDir, VAULT_FILE_NAME);
    this.backupPath = path.join(vaultDir, VAULT_BACKUP_FILE_NAME);
  }

  private async exists(): Promise<boolean> {
    try {
      await fs.access(this.vaultPath);
      return true;
    } catch {
      return false;
    }
  }

  private async readEnvelope(): Promise<EncryptedVaultEnvelope> {
    const raw = await fs.readFile(this.vaultPath, 'utf8');
    try {
      return JSON.parse(raw) as EncryptedVaultEnvelope;
    } catch {
      throw new VaultCryptoError('Vault file is corrupted or unreadable');
    }
  }

  private writeEnvelopeAtomic(envelope: EncryptedVaultEnvelope): Promise<void> {
    const task = this.writeQueue.then(async () => {
      await fs.mkdir(this.vaultDir, { recursive: true });
      const serialized = JSON.stringify(envelope, null, 2);

      if (await this.exists()) {
        await fs.copyFile(this.vaultPath, this.backupPath);
      }

      const uniqueSuffix = `${Date.now()}-${randomBytes(4).toString('hex')}`;
      const tempPath = `${this.vaultPath}.tmp-${uniqueSuffix}`;
      await fs.writeFile(
        tempPath,
        serialized,
        process.platform === 'win32' ? 'utf8' : { encoding: 'utf8', mode: 0o600 },
      );
      try {
        await fs.rename(tempPath, this.vaultPath);
      } catch {
        await fs.copyFile(tempPath, this.vaultPath);
        await fs.unlink(tempPath).catch(() => {});
      }
    });

    this.writeQueue = task.catch(() => {});
    return task;
  }

  public async getStatus(): Promise<VaultStatusInfo> {
    const fileExists = await this.exists();
    if (!fileExists) {
      return {
        state: 'uninitialized',
        vaultPath: this.vaultPath,
      };
    }

    if (this.activeDek && this.activeEnvelope) {
      return {
        state: 'unlocked',
        vaultPath: this.vaultPath,
        updatedAt: this.activeEnvelope.updatedAt,
      };
    }

    return {
      state: 'locked',
      vaultPath: this.vaultPath,
    };
  }

  public async setup(masterPassword: string): Promise<SetupVaultResult> {
    if (await this.exists()) {
      throw new VaultCryptoError('Vault is already initialized');
    }
    if (masterPassword.length < SECURITY_DEFAULTS.MIN_MASTER_PASSWORD_LENGTH) {
      throw new VaultCryptoError(
        `Master password must be at least ${SECURITY_DEFAULTS.MIN_MASTER_PASSWORD_LENGTH} characters`,
      );
    }

    const initialData = createEmptyVaultData();
    const { envelope, recoveryPhrase, dek } = await createEncryptedVault(
      masterPassword,
      initialData,
    );

    await this.writeEnvelopeAtomic(envelope);
    this.lock();
    this.activeDek = dek;
    this.activeEnvelope = envelope;

    return {
      recoveryPhrase,
      vaultData: initialData,
      status: await this.getStatus(),
    };
  }

  public async unlock(masterPassword: string): Promise<UnlockVaultResult> {
    if (!(await this.exists())) {
      throw new VaultCryptoError('Vault is not initialized');
    }

    const envelope = await this.readEnvelope();
    const { vaultData, dek } = await unlockVaultWithPassword(envelope, masterPassword);

    this.lock();
    this.activeDek = dek;
    this.activeEnvelope = envelope;

    return {
      vaultData,
      status: await this.getStatus(),
    };
  }

  public async save(vaultData: VaultData): Promise<VaultStatusInfo> {
    if (!this.activeDek || !this.activeEnvelope) {
      throw new VaultCryptoError('Vault is locked');
    }

    const nextEnvelope = saveVaultWithDek(
      this.activeEnvelope,
      this.activeDek,
      vaultData,
    );
    await this.writeEnvelopeAtomic(nextEnvelope);
    this.activeEnvelope = nextEnvelope;

    return this.getStatus();
  }

  public async recover(
    recoveryPhrase: string,
    newMasterPassword: string,
    regenerateRecoveryPhrase = false,
  ): Promise<RecoverVaultResult> {
    if (!(await this.exists())) {
      throw new VaultCryptoError('Vault is not initialized');
    }
    if (newMasterPassword.length < SECURITY_DEFAULTS.MIN_MASTER_PASSWORD_LENGTH) {
      throw new VaultCryptoError(
        `Master password must be at least ${SECURITY_DEFAULTS.MIN_MASTER_PASSWORD_LENGTH} characters`,
      );
    }

    const envelope = await this.readEnvelope();
    const result = await recoverVaultWithPhrase(
      envelope,
      recoveryPhrase,
      newMasterPassword,
      regenerateRecoveryPhrase,
    );

    await this.writeEnvelopeAtomic(result.envelope);
    this.lock();
    this.activeDek = result.dek;
    this.activeEnvelope = result.envelope;

    return {
      vaultData: result.vaultData,
      newRecoveryPhrase: result.newRecoveryPhrase,
      status: await this.getStatus(),
    };
  }

  public async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<VaultStatusInfo> {
    if (!(await this.exists())) {
      throw new VaultCryptoError('Vault is not initialized');
    }
    if (newPassword.length < SECURITY_DEFAULTS.MIN_MASTER_PASSWORD_LENGTH) {
      throw new VaultCryptoError(
        `Master password must be at least ${SECURITY_DEFAULTS.MIN_MASTER_PASSWORD_LENGTH} characters`,
      );
    }

    const envelope = await this.readEnvelope();
    const { envelope: nextEnvelope, dek } = await changeMasterPassword(
      envelope,
      currentPassword,
      newPassword,
    );

    await this.writeEnvelopeAtomic(nextEnvelope);
    this.lock();
    this.activeDek = dek;
    this.activeEnvelope = nextEnvelope;

    return this.getStatus();
  }

  public lock(): void {
    zeroizeBuffer(this.activeDek);
    this.activeDek = null;
    this.activeEnvelope = null;
  }
}
