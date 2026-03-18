import { describe, expect, it } from 'vitest';
import { detectPreferredLanguage, normalizeLanguageCode } from '@/i18n/language';

describe('language normalization', () => {
  it('normalizes legacy zh to zh-CN for persisted settings', () => {
    expect(normalizeLanguageCode('zh')).toBe('zh-CN');
  });

  it('maps Taiwan locale to zh-TW', () => {
    expect(normalizeLanguageCode('zh-TW')).toBe('zh-TW');
    expect(detectPreferredLanguage('zh-TW')).toBe('zh-TW');
  });

  it('maps simplified Chinese locales to zh-CN', () => {
    expect(normalizeLanguageCode('zh-CN')).toBe('zh-CN');
    expect(detectPreferredLanguage('zh-SG')).toBe('zh-CN');
  });

  it('prefers zh-TW for generic Chinese system locales', () => {
    expect(detectPreferredLanguage('zh')).toBe('zh-TW');
  });

  it('falls back Japanese locales to English', () => {
    expect(normalizeLanguageCode('ja')).toBe('en');
    expect(normalizeLanguageCode('ja-JP')).toBe('en');
    expect(detectPreferredLanguage('ja')).toBe('en');
    expect(detectPreferredLanguage('ja-JP')).toBe('en');
  });
});
