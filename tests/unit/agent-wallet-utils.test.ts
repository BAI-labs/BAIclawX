import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAgentWalletBaiclawPasswordMock = vi.fn();
const getSettingMock = vi.fn();

vi.mock('@electron/services/secrets/app-secret-store', () => ({
  getAgentWalletBaiclawPassword: (...args: unknown[]) => getAgentWalletBaiclawPasswordMock(...args),
}));

vi.mock('@electron/utils/store', () => ({
  getSetting: (...args: unknown[]) => getSettingMock(...args),
}));

describe('agent-wallet utils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('builds runtime env using the baiclaw-specific wallet directory', async () => {
    getAgentWalletBaiclawPasswordMock.mockResolvedValueOnce('Secret-123!');
    const { loadAgentWalletRuntimeEnv } = await import('@electron/utils/agent-wallet');

    const env = await loadAgentWalletRuntimeEnv();

    expect(env.AGENT_WALLET_DIR).toContain('.openclaw/agent-wallet-baiclaw');
    expect(env.AGENT_WALLET_PASSWORD).toBe('Secret-123!');
    expect(env.AGENT_WALLET_BAICLAW_PASSWORD).toBe('Secret-123!');
  });

  it('reports config without exposing the password', async () => {
    getAgentWalletBaiclawPasswordMock.mockResolvedValueOnce('Secret-123!');
    getSettingMock.mockResolvedValueOnce(' wallet-a ');
    const { getAgentWalletRuntimeConfig } = await import('@electron/utils/agent-wallet');

    const config = await getAgentWalletRuntimeConfig();

    expect(config.walletDir).toContain('.openclaw/agent-wallet-baiclaw');
    expect(config.defaultWalletId).toBe('baiclaw_wallet');
    expect(config.selectedWalletId).toBe('wallet-a');
    expect(config.hasPassword).toBe(true);
    expect(config).not.toHaveProperty('password');
  });
});
