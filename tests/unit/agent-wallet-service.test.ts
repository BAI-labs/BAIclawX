import { beforeEach, describe, expect, it, vi } from 'vitest';

const accessMock = vi.fn();
const readFileMock = vi.fn();
const mkdirMock = vi.fn();
const writeFileMock = vi.fn();
const chmodMock = vi.fn();
const unlinkMock = vi.fn();

const verifyPasswordMock = vi.fn();
const initMasterMock = vi.fn();
const decryptStringMock = vi.fn();

const getPathMock = vi.fn(() => '/tmp/fake-home');
const isEncryptionAvailableMock = vi.fn(() => true);

const getAgentWalletBaiclawPasswordMock = vi.fn();

vi.mock('node:fs/promises', () => ({
  default: {
    access: (...args: unknown[]) => accessMock(...args),
    readFile: (...args: unknown[]) => readFileMock(...args),
    mkdir: (...args: unknown[]) => mkdirMock(...args),
    writeFile: (...args: unknown[]) => writeFileMock(...args),
    chmod: (...args: unknown[]) => chmodMock(...args),
    unlink: (...args: unknown[]) => unlinkMock(...args),
  },
}));

vi.mock('electron', () => ({
  app: {
    getPath: (...args: unknown[]) => getPathMock(...args),
  },
  safeStorage: {
    isEncryptionAvailable: (...args: unknown[]) => isEncryptionAvailableMock(...args),
    decryptString: (...args: unknown[]) => decryptStringMock(...args),
    encryptString: vi.fn(),
  },
}));

vi.mock('@bankofai/agent-wallet', () => ({
  ConfigWalletProvider: class {
    listWallets() {
      return [];
    }
  },
  SecureKVStore: class {
    verifyPassword() {
      return verifyPasswordMock();
    }
    initMaster() {
      return initMasterMock();
    }
  },
  TronSigner: class {},
  loadRuntimeSecretsPassword: vi.fn(() => null),
}));

vi.mock('@electron/services/secrets/app-secret-store', () => ({
  getAgentWalletBaiclawPassword: (...args: unknown[]) => getAgentWalletBaiclawPasswordMock(...args),
}));

vi.mock('@electron/services/agent-wallet/bankofai-tron-verify', () => ({
  verifyBankOfAiApiKeyByWalletAddress: vi.fn(),
}));

vi.mock('@electron/utils/secure-storage', () => ({
  getApiKey: vi.fn(),
}));

vi.mock('@electron/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('agent-wallet-service listAgentWallets', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getPathMock.mockReturnValue('/tmp/fake-home');
    isEncryptionAvailableMock.mockReturnValue(true);
    getAgentWalletBaiclawPasswordMock.mockResolvedValue('');
    verifyPasswordMock.mockReturnValue(undefined);
    initMasterMock.mockReturnValue(undefined);
    decryptStringMock.mockReturnValue('Password-123!');
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
    chmodMock.mockResolvedValue(undefined);
    unlinkMock.mockResolvedValue(undefined);
  });

  it('surfaces a partial vault when only kv-password exists', async () => {
    accessMock.mockImplementation(async (target: string) => {
      if (target.endsWith('kv-password.bin')) return;
      throw new Error('ENOENT');
    });
    readFileMock.mockResolvedValue(Buffer.from('encrypted'));

    const { listAgentWallets } = await import('@electron/services/agent-wallet/agent-wallet-service');
    const result = await listAgentWallets();

    expect(result).toEqual({
      wallets: [],
      vaultUnlockRequired: false,
      savedPasswordMismatch: false,
      vaultTopologyIncomplete: true,
    });
  });

  it('reports savedPasswordMismatch when the stored password no longer unlocks the vault', async () => {
    accessMock.mockImplementation(async (target: string) => {
      if (target.endsWith('master.json')) return;
      if (target.endsWith('wallets_config.json')) return;
      throw new Error('ENOENT');
    });
    readFileMock.mockResolvedValue(JSON.stringify({ wallets: { baiclaw_wallet: { type: 'local_secure' } } }));
    getAgentWalletBaiclawPasswordMock.mockResolvedValue('stale-password');
    verifyPasswordMock.mockImplementation(() => {
      throw new Error('MAC mismatch');
    });

    const { listAgentWallets } = await import('@electron/services/agent-wallet/agent-wallet-service');
    const result = await listAgentWallets();

    expect(result.savedPasswordMismatch).toBe(true);
    expect(result.vaultUnlockRequired).toBe(true);
    expect(result.vaultTopologyIncomplete).toBe(false);
    expect(result.wallets).toEqual([]);
  });
});
