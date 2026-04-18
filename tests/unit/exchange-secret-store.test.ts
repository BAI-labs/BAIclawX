import { beforeEach, describe, expect, it, vi } from 'vitest';

const storeState: Record<string, unknown> = {};

const store = {
  get: vi.fn((key: string) => storeState[key]),
  set: vi.fn((key: string, value: unknown) => {
    storeState[key] = value;
  }),
};

vi.mock('@electron/services/providers/store-instance', () => ({
  getClawXProviderStore: vi.fn(async () => store),
}));

describe('exchange-secret-store', () => {
  beforeEach(() => {
    for (const key of Object.keys(storeState)) delete storeState[key];
    store.get.mockClear();
    store.set.mockClear();
  });

  it('saves and masks exchange secrets', async () => {
    const { setExchangeSecret, listExchangeConfigStatuses, buildExchangeRuntimeEnv } = await import('@electron/services/secrets/exchange-secret-store');
    await setExchangeSecret('binance', { accessKey: 'abcd1234wxyz', secretKey: 'secret-1' });

    const statuses = await listExchangeConfigStatuses();
    expect(statuses.find((item) => item.exchange === 'binance')).toMatchObject({
      configured: true,
      accessKeyMasked: 'abcd****wxyz',
    });

    await expect(buildExchangeRuntimeEnv()).resolves.toMatchObject({
      BINANCE_API_KEY: 'abcd1234wxyz',
      BINANCE_SECRET_KEY: 'secret-1',
    });
  });

  it('deletes exchange secrets', async () => {
    const { setExchangeSecret, deleteExchangeSecret, listExchangeConfigStatuses } = await import('@electron/services/secrets/exchange-secret-store');
    await setExchangeSecret('htx', { accessKey: 'htx-access', secretKey: 'htx-secret' });
    await deleteExchangeSecret('htx');

    const statuses = await listExchangeConfigStatuses();
    expect(statuses.find((item) => item.exchange === 'htx')).toMatchObject({
      configured: false,
      accessKeyMasked: undefined,
    });
  });
});
