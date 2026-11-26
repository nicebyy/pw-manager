export const APP_NAME = 'pw-manager';

export const VAULT_FILE_NAME = 'vault.pwmgr';
export const VAULT_BACKUP_FILE_NAME = 'vault.pwmgr.bak';

export const IPC_CHANNELS = {
  VAULT_STATUS: 'vault:status',
  VAULT_SETUP: 'vault:setup',
  VAULT_UNLOCK: 'vault:unlock',
  VAULT_LOCK: 'vault:lock',
  VAULT_SAVE: 'vault:save',
  VAULT_RECOVER: 'vault:recover',
  VAULT_CHANGE_PASSWORD: 'vault:change-password',
  CLIPBOARD_WRITE_SENSITIVE: 'clipboard:write-sensitive',
  APP_GET_VERSION: 'app:get-version',
} as const;

export const SECURITY_DEFAULTS = {
  MIN_MASTER_PASSWORD_LENGTH: 8,
  AUTO_LOCK_MINUTES_DEFAULT: 10,
  CLIPBOARD_CLEAR_DELAY_MS: 30_000,
  MAX_IMAGE_DATA_URL_BYTES: 256 * 1024, // 256 KB per node image after client resize
  IMAGE_MAX_DIMENSION_PX: 128,
} as const;

export const UI_DEFAULTS = {
  DEFAULT_LANGUAGE: 'ko',
  SIDEBAR_WIDTH_PX: 320,
} as const;
