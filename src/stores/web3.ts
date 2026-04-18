import { create } from 'zustand';
import type { ExchangeConfigStatus, Web3Entitlement } from '@/lib/web3-metadata';
import {
  deleteExchangeConfig,
  fetchManagedWeb3Packs,
  fetchWeb3Entitlement,
  fetchWeb3ExchangeStatuses,
  saveExchangeConfig,
  type ManagedWeb3PackState,
} from '@/lib/web3';

type Web3State = {
  entitlement: Web3Entitlement | null;
  exchanges: ExchangeConfigStatus[];
  managedPacks: ManagedWeb3PackState[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveExchange: (exchange: 'binance' | 'htx', payload: { accessKey: string; secretKey: string }) => Promise<void>;
  deleteExchange: (exchange: 'binance' | 'htx') => Promise<void>;
};

export const useWeb3Store = create<Web3State>((set, get) => ({
  entitlement: null,
  exchanges: [],
  managedPacks: [],
  loading: false,
  loaded: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [entitlement, exchanges, managedPacks] = await Promise.all([
        fetchWeb3Entitlement(),
        fetchWeb3ExchangeStatuses(),
        fetchManagedWeb3Packs(),
      ]);
      set({
        entitlement,
        exchanges,
        managedPacks,
        loading: false,
        loaded: true,
      });
    } catch (error) {
      set({
        loading: false,
        loaded: true,
        error: String(error),
      });
    }
  },

  saveExchange: async (exchange, payload) => {
    await saveExchangeConfig(exchange, payload);
    await get().refresh();
  },

  deleteExchange: async (exchange) => {
    await deleteExchangeConfig(exchange);
    await get().refresh();
  },
}));
