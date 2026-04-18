import { beforeEach, describe, expect, it, vi } from 'vitest';

const getWeb3EntitlementMock = vi.fn();
const setSkillsEnabledMock = vi.fn();
const getAllSkillConfigsMock = vi.fn();
const listExchangeConfigStatusesMock = vi.fn();

vi.mock('@electron/services/web3/entitlements', () => ({
  getWeb3Entitlement: (...args: unknown[]) => getWeb3EntitlementMock(...args),
}));

vi.mock('@electron/utils/skill-config', () => ({
  setSkillsEnabled: (...args: unknown[]) => setSkillsEnabledMock(...args),
  getAllSkillConfigs: (...args: unknown[]) => getAllSkillConfigsMock(...args),
}));

vi.mock('@electron/services/secrets/exchange-secret-store', () => ({
  listExchangeConfigStatuses: (...args: unknown[]) => listExchangeConfigStatusesMock(...args),
}));

describe('managed web3 skill state', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('enables managed packs for pro/max tiers', async () => {
    getWeb3EntitlementMock.mockResolvedValueOnce({
      tier: 'pro',
      canUseManagedWeb3Skills: true,
      source: 'mock',
    });

    const { syncManagedWeb3SkillState } = await import('@electron/services/web3/managed-web3');
    await syncManagedWeb3SkillState();

    expect(setSkillsEnabledMock).toHaveBeenCalledWith(
      ['sun-skill', 'surf', 'binance-web3-pack', 'htx-web3-pack'],
      true,
    );
  });

  it('builds managed pack states with lock and exchange configuration', async () => {
    getWeb3EntitlementMock.mockResolvedValueOnce({
      tier: 'free',
      canUseManagedWeb3Skills: false,
      source: 'mock',
    });
    getAllSkillConfigsMock.mockResolvedValueOnce({
      'sun-skill': { enabled: true },
      'binance-web3-pack': { enabled: true },
    });
    listExchangeConfigStatusesMock.mockResolvedValueOnce([
      { exchange: 'binance', configured: true, docsUrl: 'binance-docs' },
      { exchange: 'htx', configured: false, docsUrl: 'htx-docs' },
    ]);

    const { listManagedWeb3PackStates } = await import('@electron/services/web3/managed-web3');
    const packs = await listManagedWeb3PackStates();

    expect(packs.find((pack) => pack.id === 'sun-skill')).toMatchObject({
      locked: true,
      enabled: false,
      configured: true,
    });
    expect(packs.find((pack) => pack.id === 'binance-web3-pack')).toMatchObject({
      locked: true,
      enabled: false,
      configured: true,
    });
    expect(packs.find((pack) => pack.id === 'htx-web3-pack')).toMatchObject({
      configured: false,
    });
  });
});
