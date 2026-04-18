import {
  MANAGED_WEB3_PACKS,
  MANAGED_WEB3_PACK_IDS,
  type ManagedWeb3Pack,
} from '../../shared/web3';
import { getAllSkillConfigs, setSkillsEnabled } from '../../utils/skill-config';
import { getWeb3Entitlement } from './entitlements';
import { listExchangeConfigStatuses } from '../secrets/exchange-secret-store';

export type ManagedWeb3PackState = ManagedWeb3Pack & {
  locked: boolean;
  enabled: boolean;
  configured: boolean;
};

export async function syncManagedWeb3SkillState(): Promise<void> {
  const entitlement = await getWeb3Entitlement();
  await setSkillsEnabled(MANAGED_WEB3_PACK_IDS, entitlement.canUseManagedWeb3Skills);
}

export async function listManagedWeb3PackStates(): Promise<ManagedWeb3PackState[]> {
  const [entitlement, configs, exchanges] = await Promise.all([
    getWeb3Entitlement(),
    getAllSkillConfigs(),
    listExchangeConfigStatuses(),
  ]);
  const exchangeMap = new Map(exchanges.map((item) => [item.exchange, item]));

  return MANAGED_WEB3_PACKS.map((pack) => {
    const config = configs[pack.id];
    const exchangeStatus = pack.requiredExchange ? exchangeMap.get(pack.requiredExchange) : undefined;
    return {
      ...pack,
      locked: !entitlement.canUseManagedWeb3Skills,
      enabled: Boolean(config?.enabled) && entitlement.canUseManagedWeb3Skills,
      configured: pack.requiredExchange ? Boolean(exchangeStatus?.configured) : true,
    };
  });
}
