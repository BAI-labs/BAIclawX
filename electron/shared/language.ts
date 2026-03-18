const SIMPLIFIED_CHINESE_REGIONS = ['cn', 'sg'];
const TRADITIONAL_CHINESE_REGIONS = ['tw', 'hk', 'mo'];

export type AppLanguageCode = 'en' | 'zh-CN' | 'zh-TW';

function normalizeChineseLanguage(locale: string): AppLanguageCode {
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

export function normalizeAppLanguageCode(locale: string | null | undefined): AppLanguageCode {
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

export function detectPreferredAppLanguage(locale: string | null | undefined): AppLanguageCode {
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
