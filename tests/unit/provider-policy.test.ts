import { describe, expect, it } from 'vitest';
import {
  filterVisibleProviderAccounts,
  filterVisibleProviderTypeInfo,
  getChatProviderGate,
  VISIBLE_PROVIDER_TYPES,
} from '@/lib/provider-policy';
import { PROVIDER_TYPE_INFO, type ProviderAccount } from '@/lib/providers';

function buildAccount(overrides: Partial<ProviderAccount>): ProviderAccount {
  return {
    id: 'account-1',
    vendorId: 'bai',
    label: 'BAI',
    authMode: 'api_key',
    baseUrl: 'https://api.bai.io/v1',
    model: 'gpt-5.2',
    enabled: true,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('provider policy', () => {
  it('limits visible providers to BAI', () => {
    expect(VISIBLE_PROVIDER_TYPES).toEqual(['bai']);
    expect(filterVisibleProviderTypeInfo(PROVIDER_TYPE_INFO).map((provider) => provider.id)).toEqual(['bai']);
  });

  it('filters hidden provider accounts from product UI', () => {
    expect(filterVisibleProviderAccounts([
      buildAccount({ id: 'bai-1', vendorId: 'bai' }),
      buildAccount({ id: 'openai-1', vendorId: 'openai' }),
    ]).map((account) => account.id)).toEqual(['bai-1']);
  });

  it('blocks chat when default provider is not BAI', () => {
    const accounts = [
      buildAccount({ id: 'bai-1', vendorId: 'bai' }),
      buildAccount({ id: 'openai-1', vendorId: 'openai' }),
    ];

    expect(getChatProviderGate(accounts, 'openai-1')).toEqual({
      blocked: true,
      reason: 'default_not_allowed',
    });
    expect(getChatProviderGate(accounts, 'bai-1')).toEqual({
      blocked: false,
      reason: null,
    });
  });
});
