import { describe, expect, it } from 'vitest';
import { en, ko, translate } from '../../src/locales/index.ts';

describe('i18n translation dictionaries', () => {
  it('maintains 100% key parity between ko and en', () => {
    const koKeys = Object.keys(ko).sort();
    const enKeys = Object.keys(en).sort();
    expect(enKeys).toEqual(koKeys);
  });

  it('interpolates dynamic parameters accurately in both languages', () => {
    expect(translate('ko', 'statsSummary', { nodes: 4, pairs: 9 })).toBe(
      '항목 4개 · Key-Value 9개',
    );
    expect(translate('en', 'statsSummary', { nodes: 4, pairs: 9 })).toBe(
      '4 items · 9 pairs',
    );
  });
});
