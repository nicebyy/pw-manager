const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}';

export interface PasswordGenOptions {
  length?: number;
  includeSymbols?: boolean;
}

/**
 * Generates a cryptographically random password using Web Crypto `getRandomValues`.
 */
export function generateStrongPassword(options: PasswordGenOptions = {}): string {
  const length = Math.max(8, options.length ?? 20);
  const includeSymbols = options.includeSymbols ?? true;
  const charset = LOWERCASE + UPPERCASE + DIGITS + (includeSymbols ? SYMBOLS : '');

  const requiredChars = [
    LOWERCASE[randomIndex(LOWERCASE.length)],
    UPPERCASE[randomIndex(UPPERCASE.length)],
    DIGITS[randomIndex(DIGITS.length)],
    ...(includeSymbols ? [SYMBOLS[randomIndex(SYMBOLS.length)]] : []),
  ];

  const chars = [...requiredChars];
  while (chars.length < length) {
    chars.push(charset[randomIndex(charset.length)]);
  }

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return chars.join('');
}

function randomIndex(max: number): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] % max;
}
