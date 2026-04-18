import { getSetting } from '../../utils/store';
import type { Web3Entitlement, Web3EntitlementTier } from '../../shared/web3';

function normalizeTier(value: unknown): Web3EntitlementTier {
  if (value === 'free' || value === 'pro' || value === 'max' || value === 'unknown') {
    return value;
  }
  return 'unknown';
}

export async function getWeb3Entitlement(): Promise<Web3Entitlement> {
  const tier = normalizeTier(await getSetting('mockWeb3Tier'));
  return {
    tier,
    canUseManagedWeb3Skills: tier === 'pro' || tier === 'max',
    source: 'mock',
  };
}
