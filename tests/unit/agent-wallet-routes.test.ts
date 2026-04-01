import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';

const parseJsonBodyMock = vi.fn();
const sendJsonMock = vi.fn();
const getAgentWalletRuntimeConfigMock = vi.fn();
const getAgentWalletBaiclawPasswordMock = vi.fn();
const setAgentWalletBaiclawPasswordMock = vi.fn();
const listAgentWalletsMock = vi.fn();
const unlockAgentWalletVaultMock = vi.fn();
const setAgentWalletBaiclawRuntimePasswordMock = vi.fn();
const validateTronPrivateKeyForBankOfAiMock = vi.fn();
const createAgentWalletFromTronImportMock = vi.fn();
const deleteAgentWalletMock = vi.fn();
const getAgentWalletStoragePathMock = vi.fn();
const syncGatewayConfigBeforeLaunchMock = vi.fn();
const getAllSettingsMock = vi.fn();
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

vi.mock('@electron/services/agent-wallet/agent-wallet-service', () => ({
  listAgentWallets: (...args: unknown[]) => listAgentWalletsMock(...args),
  unlockAgentWalletVault: (...args: unknown[]) => unlockAgentWalletVaultMock(...args),
  setAgentWalletBaiclawRuntimePassword: (...args: unknown[]) => setAgentWalletBaiclawRuntimePasswordMock(...args),
  validateTronPrivateKeyForBankOfAi: (...args: unknown[]) => validateTronPrivateKeyForBankOfAiMock(...args),
  createAgentWalletFromTronImport: (...args: unknown[]) => createAgentWalletFromTronImportMock(...args),
  deleteAgentWallet: (...args: unknown[]) => deleteAgentWalletMock(...args),
  getAgentWalletStoragePath: (...args: unknown[]) => getAgentWalletStoragePathMock(...args),
}));

vi.mock('@electron/gateway/config-sync', () => ({
  syncGatewayConfigBeforeLaunch: (...args: unknown[]) => syncGatewayConfigBeforeLaunchMock(...args),
}));

vi.mock('@electron/utils/store', () => ({
  getAllSettings: (...args: unknown[]) => getAllSettingsMock(...args),
  setSetting: (...args: unknown[]) => setSettingMock(...args),
}));

describe('handleAgentWalletRoutes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAllSettingsMock.mockResolvedValue({});
    syncGatewayConfigBeforeLaunchMock.mockResolvedValue(undefined);
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
    expect(syncGatewayConfigBeforeLaunchMock).not.toHaveBeenCalled();
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

  it('awaits vault unlock before syncing config and restarting gateway', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      masterPassword: 'Unlock-password-123!',
    });
    unlockAgentWalletVaultMock.mockResolvedValueOnce(undefined);
    const restart = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      gatewayManager: {
        restart,
      },
    } as never;

    const { handleAgentWalletRoutes } = await import('@electron/api/routes/agent-wallet');
    const handled = await handleAgentWalletRoutes(
      { method: 'POST' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/agent-wallets/unlock'),
      ctx,
    );

    expect(handled).toBe(true);
    expect(unlockAgentWalletVaultMock).toHaveBeenCalledWith('Unlock-password-123!');
    expect(setAgentWalletBaiclawRuntimePasswordMock).toHaveBeenCalledWith('Unlock-password-123!');
    expect(syncGatewayConfigBeforeLaunchMock).toHaveBeenCalledWith({});
    expect(restart).toHaveBeenCalledTimes(1);
    expect(sendJsonMock).toHaveBeenCalledWith(expect.anything(), 200, { success: true });
  });

  it('returns savedPasswordMismatch in the wallet list payload', async () => {
    listAgentWalletsMock.mockResolvedValueOnce({
      wallets: [],
      vaultUnlockRequired: false,
      savedPasswordMismatch: true,
      vaultTopologyIncomplete: false,
    });
    getAgentWalletStoragePathMock.mockReturnValueOnce('/tmp/agent-wallet-baiclaw');

    const { handleAgentWalletRoutes } = await import('@electron/api/routes/agent-wallet');
    const handled = await handleAgentWalletRoutes(
      { method: 'GET' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/agent-wallets'),
      {} as never,
    );

    expect(handled).toBe(true);
    expect(sendJsonMock).toHaveBeenCalledWith(expect.anything(), 200, {
      success: true,
      wallets: [],
      vaultUnlockRequired: false,
      savedPasswordMismatch: true,
      vaultTopologyIncomplete: false,
      storagePath: '/tmp/agent-wallet-baiclaw',
    });
  });

  it('persists the new master password after wallet creation and restarts the gateway', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      privateKey: 'abcd',
      masterPassword: 'New-password-123!',
      bankOfAiAccountId: 'bankofai-1',
    });
    createAgentWalletFromTronImportMock.mockResolvedValueOnce({
      id: 'baiclaw_wallet',
      address: 'T123',
      network: 'tron',
      isActive: true,
    });
    getAgentWalletStoragePathMock.mockReturnValueOnce('/tmp/agent-wallet-baiclaw');

    const restart = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      gatewayManager: {
        restart,
      },
    } as never;

    const { handleAgentWalletRoutes } = await import('@electron/api/routes/agent-wallet');
    const handled = await handleAgentWalletRoutes(
      { method: 'POST' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/agent-wallets'),
      ctx,
    );

    expect(handled).toBe(true);
    expect(setAgentWalletBaiclawPasswordMock).toHaveBeenCalledWith('New-password-123!');
    expect(setAgentWalletBaiclawRuntimePasswordMock).toHaveBeenCalledWith('New-password-123!');
    expect(syncGatewayConfigBeforeLaunchMock).toHaveBeenCalledWith({});
    expect(restart).toHaveBeenCalledTimes(1);
    expect(sendJsonMock).toHaveBeenCalledWith(expect.anything(), 200, {
      success: true,
      wallet: {
        id: 'baiclaw_wallet',
        address: 'T123',
        network: 'tron',
        isActive: true,
      },
      storagePath: '/tmp/agent-wallet-baiclaw',
    });
  });
});
