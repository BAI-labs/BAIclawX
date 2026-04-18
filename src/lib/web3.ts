import { hostApiFetch } from './host-api';
import {
  MANAGED_WEB3_PACKS,
  type ExchangeConfigStatus,
  type Web3Entitlement,
} from './web3-metadata';

export type ManagedWeb3PackState = (typeof MANAGED_WEB3_PACKS)[number] & {
  locked: boolean;
  enabled: boolean;
  configured: boolean;
};

export async function fetchWeb3Entitlement(): Promise<Web3Entitlement> {
  return await hostApiFetch<Web3Entitlement>('/api/entitlements/web3');
}

export async function fetchWeb3ExchangeStatuses(): Promise<ExchangeConfigStatus[]> {
  const response = await hostApiFetch<{ exchanges: ExchangeConfigStatus[] }>('/api/web3/exchanges');
  return response.exchanges ?? [];
}

export async function fetchManagedWeb3Packs(): Promise<ManagedWeb3PackState[]> {
  const response = await hostApiFetch<{ packs: ManagedWeb3PackState[] }>('/api/web3/managed-packs');
  return response.packs ?? [];
}

export async function saveExchangeConfig(
  exchange: 'binance' | 'htx',
  payload: { accessKey: string; secretKey: string },
): Promise<void> {
  await hostApiFetch<{ success: boolean }>(`/api/web3/exchanges/${exchange}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteExchangeConfig(exchange: 'binance' | 'htx'): Promise<void> {
  await hostApiFetch<{ success: boolean }>(`/api/web3/exchanges/${exchange}`, {
    method: 'DELETE',
  });
}
