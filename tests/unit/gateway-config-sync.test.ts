import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ProviderAccount } from '@electron/shared/providers/types';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getLocale: () => 'en-US',
    getPath: () => '/tmp',
  },
}));

let pickCompatibilityProviderAccount: typeof import('@electron/gateway/config-sync').pickCompatibilityProviderAccount;

function buildAccount(overrides: Partial<ProviderAccount> & Pick<ProviderAccount, 'id'>): ProviderAccount {
  return {
    id: overrides.id,
    vendorId: overrides.vendorId ?? 'bankofai',
    label: overrides.label ?? overrides.id,
    authMode: overrides.authMode ?? 'api_key',
    baseUrl: overrides.baseUrl,
    apiProtocol: overrides.apiProtocol,
    model: overrides.model,
    fallbackModels: overrides.fallbackModels,
    fallbackAccountIds: overrides.fallbackAccountIds,
    enabled: overrides.enabled ?? true,
    isDefault: overrides.isDefault ?? false,
    metadata: overrides.metadata,
    createdAt: overrides.createdAt ?? '2026-03-27T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-27T00:00:00.000Z',
  };
}

describe('gateway config sync compatibility helpers', () => {
  beforeAll(async () => {
    ({ pickCompatibilityProviderAccount } = await import('@electron/gateway/config-sync'));
  });

  it('prefers the configured default account for compatibility env injection', () => {
    const selected = pickCompatibilityProviderAccount([
      buildAccount({ id: 'bankofai-old', updatedAt: '2026-03-26T00:00:00.000Z' }),
      buildAccount({ id: 'bankofai-new', updatedAt: '2026-03-27T00:00:00.000Z' }),
    ], 'bankofai', 'bankofai-old');

    expect(selected?.id).toBe('bankofai-old');
  });

  it('falls back to the vendor default account when no explicit default id is passed', () => {
    const selected = pickCompatibilityProviderAccount([
      buildAccount({ id: 'bankofai-a', isDefault: false, updatedAt: '2026-03-26T00:00:00.000Z' }),
      buildAccount({ id: 'bankofai-b', isDefault: true, updatedAt: '2026-03-25T00:00:00.000Z' }),
    ], 'bankofai');

    expect(selected?.id).toBe('bankofai-b');
  });

  it('falls back to the newest enabled account when no default exists', () => {
    const selected = pickCompatibilityProviderAccount([
      buildAccount({ id: 'bankofai-disabled', enabled: false, updatedAt: '2026-03-28T00:00:00.000Z' }),
      buildAccount({ id: 'bankofai-old', updatedAt: '2026-03-26T00:00:00.000Z' }),
      buildAccount({ id: 'bankofai-new', updatedAt: '2026-03-27T00:00:00.000Z' }),
    ], 'bankofai');

    expect(selected?.id).toBe('bankofai-new');
  });

  it('returns null when no matching vendor accounts exist', () => {
    const selected = pickCompatibilityProviderAccount([
      buildAccount({ id: 'openai-1', vendorId: 'openai' }),
    ], 'bankofai');

    expect(selected).toBeNull();
  });
});
