export const WEB3_ENTITLEMENT_TIERS = ['free', 'pro', 'max', 'unknown'] as const;
export type Web3EntitlementTier = (typeof WEB3_ENTITLEMENT_TIERS)[number];

export const WEB3_EXCHANGES = ['binance', 'htx'] as const;
export type Web3Exchange = (typeof WEB3_EXCHANGES)[number];

export type Web3Entitlement = {
  tier: Web3EntitlementTier;
  canUseManagedWeb3Skills: boolean;
  source: 'mock' | 'backend';
};

export type ExchangeConfigStatus = {
  exchange: Web3Exchange;
  configured: boolean;
  accessKeyMasked?: string;
  docsUrl: string;
  updatedAt?: string;
};

export type ManagedWeb3Pack = {
  id: string;
  title: string;
  description: string;
  docsUrl: string;
  requiredExchange?: Web3Exchange;
};

export const WEB3_EXCHANGE_DOCS: Record<Web3Exchange, string> = {
  binance: 'https://www.binance.com/zh-CN/my/settings/api-management',
  htx: 'https://www.htx.com/apikey/',
};

export const MANAGED_WEB3_PACKS: ManagedWeb3Pack[] = [
  {
    id: 'sun-skill',
    title: 'sun-skill',
    description: 'Justin Sun market perspective and Web3 decision support.',
    docsUrl: 'https://github.com/0xquqi/sun-skill',
  },
  {
    id: 'surf',
    title: 'surf',
    description: 'Surf market analysis, token discovery, and signal research workflows.',
    docsUrl: 'https://agents.asksurf.ai/',
  },
  {
    id: 'binance-web3-pack',
    title: 'binance-web3-pack',
    description: 'Managed Binance trading workflows backed by local Binance API credentials.',
    docsUrl: 'https://github.com/binance/binance-skills-hub',
    requiredExchange: 'binance',
  },
  {
    id: 'htx-web3-pack',
    title: 'htx-web3-pack',
    description: 'Managed HTX trading workflows backed by local HTX API credentials.',
    docsUrl: 'https://github.com/htx-exchange/htx-skills-hub',
    requiredExchange: 'htx',
  },
];

export const MANAGED_WEB3_PACK_IDS = MANAGED_WEB3_PACKS.map((pack) => pack.id);

export function isManagedWeb3PackId(skillId: string): boolean {
  return MANAGED_WEB3_PACK_IDS.includes(skillId);
}

export function getManagedWeb3Pack(skillId: string): ManagedWeb3Pack | undefined {
  return MANAGED_WEB3_PACKS.find((pack) => pack.id === skillId);
}
