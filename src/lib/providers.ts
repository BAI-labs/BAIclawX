import { providerIcons } from '@/assets/providers';
import { brand } from './brand';

export const PROVIDER_TYPES = [
  'bai',
  'anthropic',
  'openai',
  'google',
  'openrouter',
  'ark',
  'moonshot',
  'siliconflow',
  'minimax-portal',
  'minimax-portal-cn',
  'qwen-portal',
  'ollama',
  'custom',
] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const BUILTIN_PROVIDER_TYPES = [
  'bai',
  'anthropic',
  'openai',
  'google',
  'openrouter',
  'ark',
  'moonshot',
  'siliconflow',
  'minimax-portal',
  'minimax-portal-cn',
  'qwen-portal',
  'ollama',
] as const;

export const OLLAMA_PLACEHOLDER_API_KEY = 'ollama-local';

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl?: string;
  apiProtocol?: 'openai-completions' | 'openai-responses' | 'anthropic-messages';
  model?: string;
  fallbackModels?: string[];
  fallbackProviderIds?: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderWithKeyInfo extends ProviderConfig {
  hasKey: boolean;
  keyMasked: string | null;
}

export type ProviderAuthMode =
  | 'api_key'
  | 'oauth_device'
  | 'oauth_browser'
  | 'local';

export type ProviderVendorCategory =
  | 'official'
  | 'compatible'
  | 'local'
  | 'custom';

export interface ProviderTypeInfo {
  id: ProviderType;
  name: string;
  displayName?: string;
  icon: string;
  placeholder: string;
  model?: string;
  requiresApiKey: boolean;
  authMode?: ProviderAuthMode;
  baseUrlMode?: 'hidden' | 'optional' | 'required';
  modelSelectionMode?: 'hidden' | 'optional' | 'required';
  supportsCustomBaseUrl?: boolean;
  supportsCustomModelId?: boolean;
  sortOrder?: number;
  defaultBaseUrl?: string;
  showBaseUrl?: boolean;
  showModelId?: boolean;
  showModelIdInDevModeOnly?: boolean;
  modelIdPlaceholder?: string;
  defaultModelId?: string;
  isOAuth?: boolean;
  supportsApiKey?: boolean;
  apiKeyUrl?: string;
  docsUrl?: string;
  docsUrlZh?: string;
}

export interface ProviderVendorInfo extends ProviderTypeInfo {
  category: ProviderVendorCategory;
  envVar?: string;
  supportedAuthModes: ProviderAuthMode[];
  defaultAuthMode: ProviderAuthMode;
  supportsMultipleAccounts: boolean;
}

export interface ProviderAccount {
  id: string;
  vendorId: ProviderType;
  label: string;
  authMode: ProviderAuthMode;
  baseUrl?: string;
  apiProtocol?: 'openai-completions' | 'openai-responses' | 'anthropic-messages';
  model?: string;
  fallbackModels?: string[];
  fallbackAccountIds?: string[];
  enabled: boolean;
  isDefault: boolean;
  metadata?: {
    region?: string;
    email?: string;
    resourceUrl?: string;
    customModels?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export const PROVIDER_TYPE_INFO: ProviderTypeInfo[] = [
  {
    id: 'bai',
    name: 'BAI',
    displayName: 'BAI',
    icon: '🧠',
    placeholder: 'sk-...',
    model: 'BAI',
    requiresApiKey: true,
    authMode: 'api_key',
    baseUrlMode: 'hidden',
    modelSelectionMode: 'hidden',
    supportsCustomBaseUrl: true,
    supportsCustomModelId: true,
    defaultBaseUrl: 'https://api.b.ai/v1',
    showBaseUrl: false,
    showModelId: false,
    modelIdPlaceholder: 'bai-chat',
    defaultModelId: 'MiniMax-M2.5',
    docsUrl: 'https://docs.b.ai/BAIclaw/operation-guide/Get-API-Key/',
    sortOrder: 0,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🤖',
    placeholder: 'sk-ant-api03-...',
    model: 'Claude',
    requiresApiKey: true,
    authMode: 'api_key',
    baseUrlMode: 'hidden',
    modelSelectionMode: 'hidden',
    supportsCustomBaseUrl: false,
    supportsCustomModelId: false,
    docsUrl: 'https://platform.claude.com/docs/en/api/overview',
    sortOrder: 20,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '💚',
    placeholder: 'sk-proj-...',
    model: 'GPT',
    requiresApiKey: true,
    authMode: 'api_key',
    baseUrlMode: 'hidden',
    modelSelectionMode: 'hidden',
    supportsCustomBaseUrl: false,
    supportsCustomModelId: false,
    isOAuth: true,
    supportsApiKey: true,
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs',
    sortOrder: 30,
  },
  {
    id: 'google',
    name: 'Google',
    icon: '🔷',
    placeholder: 'AIza...',
    model: 'Gemini',
    requiresApiKey: true,
    authMode: 'api_key',
    baseUrlMode: 'hidden',
    modelSelectionMode: 'hidden',
    supportsCustomBaseUrl: false,
    supportsCustomModelId: false,
    isOAuth: true,
    supportsApiKey: true,
    defaultModelId: 'gemini-3.1-pro-preview',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    sortOrder: 40,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: '🌐',
    placeholder: 'sk-or-v1-...',
    model: 'Multi-Model',
    requiresApiKey: true,
    authMode: 'api_key',
    baseUrlMode: 'hidden',
    modelSelectionMode: 'required',
    supportsCustomBaseUrl: false,
    supportsCustomModelId: true,
    showModelId: true,
    modelIdPlaceholder: 'openai/gpt-5.4',
    defaultModelId: 'openai/gpt-5.4',
    docsUrl: 'https://openrouter.ai/models',
    sortOrder: 50,
  },
  {
    id: 'ark',
    name: 'ByteDance Ark',
    icon: 'A',
    placeholder: 'your-ark-api-key',
    model: 'Doubao',
    requiresApiKey: true,
    authMode: 'api_key',
    baseUrlMode: 'optional',
    modelSelectionMode: 'required',
    supportsCustomBaseUrl: true,
    supportsCustomModelId: true,
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    showBaseUrl: true,
    showModelId: true,
    modelIdPlaceholder: 'ep-20260228000000-xxxxx',
    docsUrl: 'https://www.volcengine.com/',
    sortOrder: 80,
  },
  {
    id: 'moonshot',
    name: 'Moonshot (CN)',
    icon: '🌙',
    placeholder: 'sk-...',
    model: 'Kimi',
    requiresApiKey: true,
    authMode: 'api_key',
    baseUrlMode: 'hidden',
    modelSelectionMode: 'hidden',
    supportsCustomBaseUrl: false,
    supportsCustomModelId: false,
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModelId: 'kimi-k2.5',
    docsUrl: 'https://platform.moonshot.cn/',
    sortOrder: 90,
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow (CN)',
    icon: '🌊',
    placeholder: 'sk-...',
    model: 'Multi-Model',
    requiresApiKey: true,
    authMode: 'api_key',
    baseUrlMode: 'hidden',
    modelSelectionMode: 'required',
    supportsCustomBaseUrl: false,
    supportsCustomModelId: true,
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    showModelId: true,
    modelIdPlaceholder: 'deepseek-ai/DeepSeek-V3',
    defaultModelId: 'deepseek-ai/DeepSeek-V3',
    docsUrl: 'https://docs.siliconflow.cn/cn/userguide/introduction',
    sortOrder: 100,
  },
  {
    id: 'minimax-portal',
    name: 'MiniMax (Global)',
    icon: '☁️',
    placeholder: 'sk-...',
    model: 'MiniMax',
    requiresApiKey: false,
    authMode: 'oauth_device',
    baseUrlMode: 'hidden',
    modelSelectionMode: 'hidden',
    supportsCustomBaseUrl: false,
    supportsCustomModelId: false,
    isOAuth: true,
    supportsApiKey: true,
    defaultModelId: 'MiniMax-M2.5',
    apiKeyUrl: 'https://intl.minimaxi.com/',
    docsUrl: 'https://intl.minimaxi.com/',
    sortOrder: 110,
  },
  {
    id: 'minimax-portal-cn',
    name: 'MiniMax (CN)',
    icon: '☁️',
    placeholder: 'sk-...',
    model: 'MiniMax',
    requiresApiKey: false,
    authMode: 'oauth_device',
    baseUrlMode: 'hidden',
    modelSelectionMode: 'hidden',
    supportsCustomBaseUrl: false,
    supportsCustomModelId: false,
    isOAuth: true,
    supportsApiKey: true,
    defaultModelId: 'MiniMax-M2.5',
    apiKeyUrl: 'https://platform.minimaxi.com/',
    docsUrl: 'https://platform.minimaxi.com/',
    sortOrder: 120,
  },
  {
    id: 'qwen-portal',
    name: 'Qwen',
    icon: '☁️',
    placeholder: 'sk-...',
    model: 'Qwen',
    requiresApiKey: false,
    authMode: 'oauth_device',
    baseUrlMode: 'hidden',
    modelSelectionMode: 'hidden',
    supportsCustomBaseUrl: false,
    supportsCustomModelId: false,
    isOAuth: true,
    defaultModelId: 'coder-model',
    docsUrl: 'https://portal.qwen.ai/',
    sortOrder: 130,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    icon: '🦙',
    placeholder: 'Not required',
    requiresApiKey: false,
    authMode: 'local',
    baseUrlMode: 'optional',
    modelSelectionMode: 'required',
    supportsCustomBaseUrl: true,
    supportsCustomModelId: true,
    defaultBaseUrl: 'http://localhost:11434/v1',
    showBaseUrl: true,
    showModelId: true,
    modelIdPlaceholder: 'qwen3:latest',
    docsUrl: 'https://ollama.com/',
    sortOrder: 140,
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: '⚙️',
    placeholder: 'API key...',
    requiresApiKey: true,
    authMode: 'api_key',
    baseUrlMode: 'required',
    modelSelectionMode: 'required',
    supportsCustomBaseUrl: true,
    supportsCustomModelId: true,
    showBaseUrl: true,
    showModelId: true,
    modelIdPlaceholder: 'your-provider/model-id',
    docsUrl: brand.docsUrl,
    docsUrlZh: brand.docsUrl,
    sortOrder: 999,
  },
];

/** Get the SVG logo URL for a provider type, falls back to undefined */
export function getProviderIconUrl(type: ProviderType | string): string | undefined {
  return providerIcons[type];
}

/** Whether a provider's logo needs CSS invert in dark mode (all logos are monochrome) */
export function shouldInvertInDark(_type: ProviderType | string): boolean {
  return true;
}

/** Provider list shown in the Setup wizard */
export const SETUP_PROVIDERS = PROVIDER_TYPE_INFO;

/** Get type info by provider type id */
export function getProviderTypeInfo(type: ProviderType): ProviderTypeInfo | undefined {
  return PROVIDER_TYPE_INFO.find((t) => t.id === type);
}

export function getProviderDocsUrl(
  provider: Pick<ProviderTypeInfo, 'docsUrl' | 'docsUrlZh'> | undefined,
  language: string
): string | undefined {
  if (!provider?.docsUrl) {
    return undefined;
  }

  if (language.startsWith('zh') && provider.docsUrlZh) {
    return provider.docsUrlZh;
  }

  return provider.docsUrl;
}

export function shouldShowProviderModelId(
  provider: Pick<ProviderTypeInfo, 'modelSelectionMode' | 'showModelId' | 'showModelIdInDevModeOnly'> | undefined,
  devModeUnlocked: boolean
): boolean {
  if (provider?.modelSelectionMode === 'hidden') return false;
  if (!provider?.showModelId) return false;
  if (provider.showModelIdInDevModeOnly && !devModeUnlocked) return false;
  return true;
}

export function shouldShowProviderBaseUrl(
  provider: Pick<ProviderTypeInfo, 'baseUrlMode' | 'showBaseUrl'> | undefined,
): boolean {
  if (provider?.baseUrlMode === 'hidden') return false;
  return Boolean(provider?.showBaseUrl);
}

export function resolveProviderModelForSave(
  provider: Pick<ProviderTypeInfo, 'defaultModelId' | 'modelSelectionMode' | 'showModelId' | 'showModelIdInDevModeOnly'> | undefined,
  modelId: string,
  devModeUnlocked: boolean
): string | undefined {
  if (!shouldShowProviderModelId(provider, devModeUnlocked)) {
    return undefined;
  }

  const trimmedModelId = modelId.trim();
  return trimmedModelId || provider?.defaultModelId || undefined;
}

/** Normalize provider API key before saving; Ollama uses a local placeholder when blank. */
export function resolveProviderApiKeyForSave(type: ProviderType | string, apiKey: string): string | undefined {
  const trimmed = apiKey.trim();
  if (type === 'ollama') {
    return trimmed || OLLAMA_PLACEHOLDER_API_KEY;
  }
  return trimmed || undefined;
}
