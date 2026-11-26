/**
 * Normalizes a recovery phrase by stripping optional numbering (e.g. "1.", "1)"),
 * lowercasing, and collapsing newlines/tabs/spaces into single spaces.
 */
export function normalizeRecoveryPhrase(phrase: string): string {
  return phrase
    .replace(/\b\d+[.)]\s*/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Formats a space-separated recovery phrase into a clean row x column grid
 * (default 3 columns -> 4 rows for 12 words) for intuitive copy & paste.
 */
export function formatRecoveryPhraseGrid(phrase: string, columns = 3): string {
  const words = normalizeRecoveryPhrase(phrase)
    .split(' ')
    .filter(Boolean);

  if (words.length === 0) return '';

  const maxWordLen = Math.max(...words.map((w) => w.length), 6);
  const rows: string[] = [];

  for (let i = 0; i < words.length; i += columns) {
    const slice = words.slice(i, i + columns);
    const formattedRow = slice
      .map((word, colIdx) =>
        colIdx === slice.length - 1 ? word : word.padEnd(maxWordLen + 2, ' '),
      )
      .join('');
    rows.push(formattedRow);
  }

  return rows.join('\n');
}
