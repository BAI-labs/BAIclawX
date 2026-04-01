import type {
  ProviderAccount,
  ProviderType,
  ProviderTypeInfo,
  ProviderVendorInfo,
  ProviderWithKeyInfo,
} from './providers';

export const VISIBLE_PROVIDER_TYPES = ['bai'] as const;
export const REQUIRED_CHAT_PROVIDER: ProviderType = 'bai';

export type VisibleProviderType = (typeof VISIBLE_PROVIDER_TYPES)[number];
export type ChatProviderGateReason = 'missing_required_provider' | 'default_not_allowed';

export type ChatProviderGate = {
  blocked: boolean;
  reason: ChatProviderGateReason | null;
};

export function isVisibleProviderType(type: ProviderType | string): type is VisibleProviderType {
  return VISIBLE_PROVIDER_TYPES.includes(type as VisibleProviderType);
}

export function filterVisibleProviderTypes<T extends { id: ProviderType | string }>(providers: T[]): T[] {
  return providers.filter((provider) => isVisibleProviderType(provider.id));
}

export function filterVisibleProviderVendors(vendors: ProviderVendorInfo[]): ProviderVendorInfo[] {
  return vendors.filter((vendor) => isVisibleProviderType(vendor.id));
}

export function filterVisibleProviderTypeInfo(providers: ProviderTypeInfo[]): ProviderTypeInfo[] {
  return providers.filter((provider) => isVisibleProviderType(provider.id));
}

export function filterVisibleProviderAccounts(accounts: ProviderAccount[]): ProviderAccount[] {
  return accounts.filter((account) => isVisibleProviderType(account.vendorId));
}

export function filterVisibleProviderStatuses(statuses: ProviderWithKeyInfo[]): ProviderWithKeyInfo[] {
  return statuses.filter((status) => isVisibleProviderType(status.type));
}

export function getChatProviderGate(
  accounts: ProviderAccount[],
  defaultAccountId: string | null,
): ChatProviderGate {
  const visibleAccounts = filterVisibleProviderAccounts(accounts);
  if (visibleAccounts.length === 0) {
    return { blocked: true, reason: 'missing_required_provider' };
  }

  const defaultAccount = defaultAccountId
    ? accounts.find((account) => account.id === defaultAccountId)
    : null;

  if (!defaultAccount || defaultAccount.vendorId !== REQUIRED_CHAT_PROVIDER) {
    return { blocked: true, reason: 'default_not_allowed' };
  }

  return { blocked: false, reason: null };
}
