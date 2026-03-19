import type { ProviderAccount, ProviderConfig, ProviderType } from '../../shared/providers/types';
import { getProviderDefinition } from '../../shared/providers/registry';
import { getClawXProviderStore } from './store-instance';

const PROVIDER_STORE_SCHEMA_VERSION = 1;
const LEGACY_BANKOFAI_MODEL_ID = 'chatgpt-4o-latest';
const CURRENT_BANKOFAI_MODEL_ID = 'gpt-5.2';
export const LEGACY_PROVIDER_ID = ['a', 'inft'].join('');
export const CANONICAL_PROVIDER_ID = 'bankofai';

function normalizeBankOfAiModelId(model?: string): string | undefined {
  if (!model) {
    return model;
  }

  return model === LEGACY_BANKOFAI_MODEL_ID ? CURRENT_BANKOFAI_MODEL_ID : model;
}

function normalizeProviderType(type: ProviderType): ProviderType {
  return type === LEGACY_PROVIDER_ID ? CANONICAL_PROVIDER_ID : type;
}

function normalizeProviderAccount(account: ProviderAccount): ProviderAccount {
  return {
    ...account,
    vendorId: normalizeProviderType(account.vendorId),
    model: normalizeBankOfAiModelId(account.model),
  };
}

export function normalizeProviderConfig(config: ProviderConfig): ProviderConfig {
  return {
    ...config,
    type: normalizeProviderType(config.type),
    model: normalizeBankOfAiModelId(config.model),
  };
}

function inferAuthMode(type: ProviderType): ProviderAccount['authMode'] {
  if (type === 'ollama') {
    return 'local';
  }

  const definition = getProviderDefinition(type);
  if (definition?.defaultAuthMode) {
    return definition.defaultAuthMode;
  }

  return 'api_key';
}

export function providerConfigToAccount(
  config: ProviderConfig,
  options?: { isDefault?: boolean },
): ProviderAccount {
  return normalizeProviderAccount({
    id: config.id,
    vendorId: config.type,
    label: config.name,
    authMode: inferAuthMode(config.type),
    baseUrl: config.baseUrl,
    apiProtocol: config.apiProtocol || (config.type === 'custom' || config.type === 'ollama'
      ? 'openai-completions'
      : getProviderDefinition(config.type)?.providerConfig?.api),
    model: config.model,
    fallbackModels: config.fallbackModels,
    fallbackAccountIds: config.fallbackProviderIds,
    enabled: config.enabled,
    isDefault: options?.isDefault ?? false,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  });
}

export function providerAccountToConfig(account: ProviderAccount): ProviderConfig {
  return normalizeProviderConfig({
    id: account.id,
    name: account.label,
    type: account.vendorId,
    baseUrl: account.baseUrl,
    apiProtocol: account.apiProtocol,
    model: account.model,
    fallbackModels: account.fallbackModels,
    fallbackProviderIds: account.fallbackAccountIds,
    enabled: account.enabled,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  });
}

export async function listProviderAccounts(): Promise<ProviderAccount[]> {
  const store = await getClawXProviderStore();
  const accounts = store.get('providerAccounts') as Record<string, ProviderAccount> | undefined;
  return Object.values(accounts ?? {}).map(normalizeProviderAccount);
}

export async function getProviderAccount(accountId: string): Promise<ProviderAccount | null> {
  const store = await getClawXProviderStore();
  const accounts = store.get('providerAccounts') as Record<string, ProviderAccount> | undefined;
  return accounts?.[accountId] ? normalizeProviderAccount(accounts[accountId]) : null;
}

export async function saveProviderAccount(account: ProviderAccount): Promise<void> {
  const store = await getClawXProviderStore();
  const accounts = (store.get('providerAccounts') ?? {}) as Record<string, ProviderAccount>;
  accounts[account.id] = normalizeProviderAccount(account);
  store.set('providerAccounts', accounts);
  store.set('schemaVersion', PROVIDER_STORE_SCHEMA_VERSION);
}

export async function deleteProviderAccount(accountId: string): Promise<void> {
  const store = await getClawXProviderStore();
  const accounts = (store.get('providerAccounts') ?? {}) as Record<string, ProviderAccount>;
  delete accounts[accountId];
  store.set('providerAccounts', accounts);

  if (store.get('defaultProviderAccountId') === accountId) {
    store.delete('defaultProviderAccountId');
  }
}

export async function setDefaultProviderAccount(accountId: string): Promise<void> {
  const store = await getClawXProviderStore();
  store.set('defaultProviderAccountId', accountId);

  const accounts = (store.get('providerAccounts') ?? {}) as Record<string, ProviderAccount>;
  for (const account of Object.values(accounts)) {
    account.isDefault = account.id === accountId;
  }
  store.set('providerAccounts', accounts);
}

export async function getDefaultProviderAccountId(): Promise<string | undefined> {
  const store = await getClawXProviderStore();
  return store.get('defaultProviderAccountId') as string | undefined;
}
