import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSettingMock = vi.fn();

vi.mock('@electron/utils/store', () => ({
  getSetting: (...args: unknown[]) => getSettingMock(...args),
}));

describe('getWeb3Entitlement', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it.each([
    ['free', false],
    ['pro', true],
    ['max', true],
    ['unknown', false],
    ['nope', false],
  ])('maps %s tier correctly', async (tier, allowed) => {
    getSettingMock.mockResolvedValueOnce(tier);
    const { getWeb3Entitlement } = await import('@electron/services/web3/entitlements');

    await expect(getWeb3Entitlement()).resolves.toEqual({
      tier: ['free', 'pro', 'max', 'unknown'].includes(String(tier)) ? tier : 'unknown',
      canUseManagedWeb3Skills: allowed,
      source: 'mock',
    });
  });
});
