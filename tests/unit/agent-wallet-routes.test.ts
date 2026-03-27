import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';

const parseJsonBodyMock = vi.fn();
const sendJsonMock = vi.fn();
const getAgentWalletRuntimeConfigMock = vi.fn();
const getAgentWalletBaiclawPasswordMock = vi.fn();
const setAgentWalletBaiclawPasswordMock = vi.fn();
const setSettingMock = vi.fn();

vi.mock('@electron/api/route-utils', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
  sendJson: (...args: unknown[]) => sendJsonMock(...args),
}));

vi.mock('@electron/utils/agent-wallet', () => ({
  getAgentWalletRuntimeConfig: (...args: unknown[]) => getAgentWalletRuntimeConfigMock(...args),
}));

vi.mock('@electron/services/secrets/app-secret-store', () => ({
  getAgentWalletBaiclawPassword: (...args: unknown[]) => getAgentWalletBaiclawPasswordMock(...args),
  setAgentWalletBaiclawPassword: (...args: unknown[]) => setAgentWalletBaiclawPasswordMock(...args),
}));

vi.mock('@electron/utils/store', () => ({
  setSetting: (...args: unknown[]) => setSettingMock(...args),
}));

describe('handleAgentWalletRoutes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns runtime config without requiring a password payload', async () => {
    getAgentWalletRuntimeConfigMock.mockResolvedValueOnce({
      walletDir: '/tmp/agent-wallet-baiclaw',
      defaultWalletId: 'baiclaw_wallet',
      selectedWalletId: 'baiclaw_wallet',
      hasPassword: true,
    });

    const { handleAgentWalletRoutes } = await import('@electron/api/routes/agent-wallet');
    const handled = await handleAgentWalletRoutes(
      { method: 'GET' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/agent-wallet/config'),
      {} as never,
    );

    expect(handled).toBe(true);
    expect(sendJsonMock).toHaveBeenCalledWith(expect.anything(), 200, {
      walletDir: '/tmp/agent-wallet-baiclaw',
      defaultWalletId: 'baiclaw_wallet',
      selectedWalletId: 'baiclaw_wallet',
      hasPassword: true,
    });
  });

  it('stores password and restarts the gateway when the runtime secret changes', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      password: 'New-password-123!',
      selectedWalletId: ' wallet-b ',
    });
    getAgentWalletBaiclawPasswordMock.mockResolvedValueOnce('Old-password-123!');
    getAgentWalletRuntimeConfigMock.mockResolvedValueOnce({
      walletDir: '/tmp/agent-wallet-baiclaw',
      defaultWalletId: 'baiclaw_wallet',
      selectedWalletId: 'wallet-b',
      hasPassword: true,
    });

    const restart = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      gatewayManager: {
        getStatus: () => ({ state: 'running' }),
        restart,
      },
    } as never;

    const { handleAgentWalletRoutes } = await import('@electron/api/routes/agent-wallet');
    const handled = await handleAgentWalletRoutes(
      { method: 'PUT' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/agent-wallet/config'),
      ctx,
    );

    expect(handled).toBe(true);
    expect(setSettingMock).toHaveBeenCalledWith('agentWalletSelectedWalletId', 'wallet-b');
    expect(setAgentWalletBaiclawPasswordMock).toHaveBeenCalledWith('New-password-123!');
    expect(restart).toHaveBeenCalledTimes(1);
    expect(sendJsonMock).toHaveBeenCalledWith(expect.anything(), 200, {
      success: true,
      config: {
        walletDir: '/tmp/agent-wallet-baiclaw',
        defaultWalletId: 'baiclaw_wallet',
        selectedWalletId: 'wallet-b',
        hasPassword: true,
      },
    });
  });
});
