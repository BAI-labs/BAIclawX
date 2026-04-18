export type Web3Entitlement = {
  tier: 'free' | 'pro' | 'max' | 'unknown';
  canUseManagedWeb3Skills: boolean;
  source: 'mock' | 'backend';
};

export type ExchangeConfigStatus = {
  exchange: 'binance' | 'htx';
  configured: boolean;
  accessKeyMasked?: string;
  docsUrl: string;
  updatedAt?: string;
};

export type ManagedWeb3PackMetadata = {
  id: string;
  title: string;
  description: string;
  docsUrl: string;
  requiredExchange?: 'binance' | 'htx';
};

export const MANAGED_WEB3_PACKS: ManagedWeb3PackMetadata[] = [
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
    requiredExchange: 'binance' as const,
  },
  {
    id: 'htx-web3-pack',
    title: 'htx-web3-pack',
    description: 'Managed HTX trading workflows backed by local HTX API credentials.',
    docsUrl: 'https://github.com/htx-exchange/htx-skills-hub',
    requiredExchange: 'htx' as const,
  },
] as const;

export function isManagedWeb3PackId(skillId: string): boolean {
  return MANAGED_WEB3_PACKS.some((pack) => pack.id === skillId);
}

export function getManagedWeb3Pack(skillId: string) {
  return MANAGED_WEB3_PACKS.find((pack) => pack.id === skillId);
}
