import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';

const parseJsonBodyMock = vi.fn();
const sendJsonMock = vi.fn();
const getWeb3EntitlementMock = vi.fn();
const listExchangeConfigStatusesMock = vi.fn();
const setExchangeSecretMock = vi.fn();
const deleteExchangeSecretMock = vi.fn();
const listManagedWeb3PackStatesMock = vi.fn();

vi.mock('@electron/api/route-utils', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
  sendJson: (...args: unknown[]) => sendJsonMock(...args),
}));

vi.mock('@electron/services/web3/entitlements', () => ({
  getWeb3Entitlement: (...args: unknown[]) => getWeb3EntitlementMock(...args),
}));

vi.mock('@electron/services/secrets/exchange-secret-store', () => ({
  listExchangeConfigStatuses: (...args: unknown[]) => listExchangeConfigStatusesMock(...args),
  setExchangeSecret: (...args: unknown[]) => setExchangeSecretMock(...args),
  deleteExchangeSecret: (...args: unknown[]) => deleteExchangeSecretMock(...args),
}));

vi.mock('@electron/services/web3/managed-web3', () => ({
  listManagedWeb3PackStates: (...args: unknown[]) => listManagedWeb3PackStatesMock(...args),
}));

describe('handleWeb3Routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns entitlement payload', async () => {
    getWeb3EntitlementMock.mockResolvedValueOnce({ tier: 'pro', canUseManagedWeb3Skills: true, source: 'mock' });
    const { handleWeb3Routes } = await import('@electron/api/routes/web3');

    const handled = await handleWeb3Routes(
      { method: 'GET' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/entitlements/web3'),
      {} as never,
    );

    expect(handled).toBe(true);
    expect(sendJsonMock).toHaveBeenCalledWith(expect.anything(), 200, { tier: 'pro', canUseManagedWeb3Skills: true, source: 'mock' });
  });

  it('blocks exchange writes for locked tiers', async () => {
    getWeb3EntitlementMock.mockResolvedValueOnce({ tier: 'free', canUseManagedWeb3Skills: false, source: 'mock' });
    const { handleWeb3Routes } = await import('@electron/api/routes/web3');

    await handleWeb3Routes(
      { method: 'PUT' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/web3/exchanges/binance'),
      { gatewayManager: { getStatus: () => ({ state: 'stopped' }) } } as never,
    );

    expect(setExchangeSecretMock).not.toHaveBeenCalled();
    expect(sendJsonMock).toHaveBeenCalledWith(expect.anything(), 403, expect.objectContaining({ success: false }));
  });

  it('saves exchange secrets and restarts gateway when allowed', async () => {
    getWeb3EntitlementMock.mockResolvedValueOnce({ tier: 'max', canUseManagedWeb3Skills: true, source: 'mock' });
    parseJsonBodyMock.mockResolvedValueOnce({ accessKey: 'a1', secretKey: 's1' });
    const restart = vi.fn();
    const { handleWeb3Routes } = await import('@electron/api/routes/web3');

    await handleWeb3Routes(
      { method: 'PUT' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/web3/exchanges/htx'),
      { gatewayManager: { getStatus: () => ({ state: 'running' }), restart } } as never,
    );

    expect(setExchangeSecretMock).toHaveBeenCalledWith('htx', { accessKey: 'a1', secretKey: 's1' });
    expect(restart).toHaveBeenCalledTimes(1);
    expect(sendJsonMock).toHaveBeenCalledWith(expect.anything(), 200, { success: true });
  });
});
