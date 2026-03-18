import type { LanguageCode } from './index';

const SIMPLIFIED_CHINESE_REGIONS = ['cn', 'sg'];
const TRADITIONAL_CHINESE_REGIONS = ['tw', 'hk', 'mo'];

function normalizeChineseLanguage(locale: string): LanguageCode {
  const compact = locale.toLowerCase().replace('_', '-');
  const [, region = ''] = compact.split('-');

  if (SIMPLIFIED_CHINESE_REGIONS.includes(region)) {
    return 'zh-CN';
  }

  if (TRADITIONAL_CHINESE_REGIONS.includes(region) || compact === 'zh') {
    return 'zh-TW';
  }

  return 'zh-TW';
}

export function normalizeLanguageCode(locale: string | null | undefined): LanguageCode {
  const normalized = (locale || '').trim();

  if (!normalized) {
    return 'en';
  }

  const compact = normalized.toLowerCase().replace('_', '-');

  if (compact === 'zh') {
    return 'zh-CN';
  }

  if (compact.startsWith('zh')) {
    return normalizeChineseLanguage(compact);
  }

  return 'en';
}

export function detectPreferredLanguage(locale: string | null | undefined): LanguageCode {
  const normalized = (locale || '').trim();

  if (!normalized) {
    return 'en';
  }

  const compact = normalized.toLowerCase().replace('_', '-');

  if (compact.startsWith('zh')) {
    return normalizeChineseLanguage(compact);
  }

  return 'en';
}
