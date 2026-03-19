import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rm } from 'fs/promises';

const { testHome, testUserData } = vi.hoisted(() => {
  const suffix = Math.random().toString(36).slice(2);
  return {
    testHome: `/tmp/clawx-provider-normalization-${suffix}`,
    testUserData: `/tmp/clawx-provider-normalization-user-data-${suffix}`,
  };
});

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  const mocked = {
    ...actual,
    homedir: () => testHome,
  };
  return {
    ...mocked,
    default: mocked,
  };
});

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => testUserData,
    getVersion: () => '0.0.0-test',
    getName: () => 'baiclaw-test',
  },
}));

vi.mock('electron-store', () => ({
  default: class MockElectronStore {
    private readonly data: Record<string, unknown>;

    constructor(options: { defaults?: Record<string, unknown> } = {}) {
      this.data = { ...(options.defaults ?? {}) };
    }

    get(key: string): unknown {
      return this.data[key];
    }

    set(key: string, value: unknown): void {
      this.data[key] = value;
    }

    delete(key: string): void {
      delete this.data[key];
    }
  },
}));

const LEGACY_PROVIDER = {
  id: 'ainft',
  name: 'AINFT',
  type: 'ainft',
  enabled: true,
  model: 'chatgpt-4o-latest',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
} as const;

describe('legacy provider normalization', () => {
  beforeEach(async () => {
    vi.resetModules();
    await rm(testHome, { recursive: true, force: true });
    await rm(testUserData, { recursive: true, force: true });
  });

  it('normalizes legacy ainft providers during migration', async () => {
    const { getClawXProviderStore } = await import('@electron/services/providers/store-instance');
    const store = await getClawXProviderStore();
    store.set('providers', {
      [LEGACY_PROVIDER.id]: { ...LEGACY_PROVIDER },
    });
    store.set('defaultProvider', LEGACY_PROVIDER.id);
    store.set('schemaVersion', 0);

    const { ensureProviderStoreMigrated } = await import('@electron/services/providers/provider-migration');
    await ensureProviderStoreMigrated();

    const migratedProviders = store.get('providers') as Record<string, { type: string; model?: string }>;
    const migratedAccounts = store.get('providerAccounts') as Record<string, { vendorId: string; model?: string }>;

    expect(migratedProviders[LEGACY_PROVIDER.id]).toMatchObject({
      type: 'bankofai',
      model: 'gpt-5.2',
    });
    expect(migratedAccounts[LEGACY_PROVIDER.id]).toMatchObject({
      vendorId: 'bankofai',
      model: 'gpt-5.2',
    });
    expect(store.get('defaultProviderAccountId')).toBe(LEGACY_PROVIDER.id);
  });

  it('normalizes legacy providers when reading from secure storage compatibility APIs', async () => {
    const { getClawXProviderStore } = await import('@electron/services/providers/store-instance');
    const store = await getClawXProviderStore();
    store.set('providers', {
      [LEGACY_PROVIDER.id]: { ...LEGACY_PROVIDER },
    });
    store.set('schemaVersion', 1);

    const { getProvider, getAllProviders } = await import('@electron/utils/secure-storage');

    await expect(getProvider(LEGACY_PROVIDER.id)).resolves.toMatchObject({
      id: LEGACY_PROVIDER.id,
      type: 'bankofai',
      model: 'gpt-5.2',
    });
    await expect(getAllProviders()).resolves.toEqual([
      expect.objectContaining({
        id: LEGACY_PROVIDER.id,
        type: 'bankofai',
        model: 'gpt-5.2',
      }),
    ]);
  });
});
