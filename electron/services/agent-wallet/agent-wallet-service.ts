/**
 * AgentWallet storage using @bankofai/agent-wallet (TRON, local_secure + encrypted secrets).
 */
import { app, safeStorage } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ConfigWalletProvider,
  SecureKVStore,
  TronSigner,
  loadRuntimeSecretsPassword,
  type SecretLoaderFn,
} from '@bankofai/agent-wallet';
import { fetchBankOfAiLinkedTronAddress } from './bankofai-tron-verify';
import { getApiKey } from '../../utils/secure-storage';
import { logger } from '../../utils/logger';
import { getProviderAccount } from '../providers/provider-store';

const KV_PWD_FILE = 'kv-password.bin';
const KV_PWD_PLAIN_FILE = 'kv-password.plain.txt';
const WALLET_META_FILE = 'wallet_meta.json';
const WALLETS_CONFIG_FILENAME = 'wallets_config.json';
const WALLET_ID = 'baiclaw_wallet';

const TRON_NETWORK = 'tron';
/** Legacy wallets created before TRON migration */
const LEGACY_EVM_NETWORK = 'eip155:1';

/** Main-process env for AgentWallet master password (BAIclaw / OpenClaw child processes). Not OS-wide. */
export const AGENT_WALLET_BAICLAW_PASSWORD_ENV = 'AGENT_WALLET_BAICLAW_PASSWORD';

/**
 * Sets the master password on the Electron **main** process `process.env` so forked/spawned
 * children (e.g. Gateway) inherit it. Does not modify the OS user or shell environment.
 */
export function setAgentWalletBaiclawRuntimePassword(password: string): void {
  process.env[AGENT_WALLET_BAICLAW_PASSWORD_ENV] = password;
}

export function clearAgentWalletBaiclawRuntimePassword(): void {
  delete process.env[AGENT_WALLET_BAICLAW_PASSWORD_ENV];
}

function hasAgentWalletTopologyOnDisk(): boolean {
  if (!fs.existsSync(walletsConfigPath())) return false;
  try {
    const raw = JSON.parse(fs.readFileSync(walletsConfigPath(), 'utf8')) as { wallets?: Record<string, unknown> };
    const w = raw?.wallets;
    if (!w || typeof w !== 'object') return false;
    return Object.keys(w).length > 0;
  } catch {
    return false;
  }
}

/**
 * Call from Electron main on startup (before Gateway spawn): if `wallets_config.json`
 * lists at least one wallet and the master password can be resolved (kv-password / plain /
 * runtime_secrets / existing env), set `process.env.AGENT_WALLET_BAICLAW_PASSWORD` so
 * child processes inherit it without opening the wizard.
 */
export function bootstrapAgentWalletBaiclawRuntimePassword(): void {
  if (!hasAgentWalletTopologyOnDisk()) {
    return;
  }
  try {
    const password = readKvPassword();
    setAgentWalletBaiclawRuntimePassword(password);
    logger.debug('[agent-wallet] AGENT_WALLET_BAICLAW_PASSWORD set from vault bootstrap');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === VAULT_PASSWORD_REQUIRED || msg === 'Agent wallet vault is not initialized') {
      return;
    }
    logger.warn('[agent-wallet] bootstrap AGENT_WALLET_BAICLAW_PASSWORD failed:', e);
  }
}

/**
 * Prefer Electron `app.getPath('home')` so the GUI matches the user’s real home directory
 * (CLI uses `os.homedir()` / $HOME — they usually match, but Electron is authoritative in-app).
 */
function resolveUserHomeDir(): string {
  try {
    return app.getPath('home');
  } catch {
    return os.homedir();
  }
}

/** Align with @bankofai/agent-wallet CLI: `DEFAULT_DIR` + `AGENT_WALLET_DIR` tilde expansion. */
function expandTildeWalletDir(p: string): string {
  const home = resolveUserHomeDir();
  if (p === '~') return home;
  if (p.startsWith('~/')) return path.join(home, p.slice(2));
  return p;
}

function getWalletRoot(): string {
  const fromEnv = process.env.AGENT_WALLET_DIR?.trim();
  if (fromEnv) {
    return expandTildeWalletDir(fromEnv);
  }
  return path.join(resolveUserHomeDir(), '.openclaw/agent-wallet-baiclaw');
}

/** Absolute directory used for vault files (for API/UI; compare with `agent-wallet list -d`). */
export function getAgentWalletStoragePath(): string {
  return getWalletRoot();
}

function walletsConfigPath(): string {
  return path.join(getWalletRoot(), WALLETS_CONFIG_FILENAME);
}

function masterJsonPath(): string {
  return path.join(getWalletRoot(), 'master.json');
}

/** True when `wallets_config.json` parses and `wallets` has no entries (matches empty `agent-wallet list`). */
function isTopologyEmptyOnDisk(): boolean {
  try {
    const raw = JSON.parse(fs.readFileSync(walletsConfigPath(), 'utf8')) as { wallets?: Record<string, unknown> };
    const w = raw?.wallets;
    if (!w || typeof w !== 'object') return true;
    return Object.keys(w).length === 0;
  } catch {
    return false;
  }
}

/**
 * Vault files exist but topology never registered — same state as CLI "No wallets configured."
 * with only kv-password / master / empty wallets_config (no `secret_<id>.json`).
 */
function getVaultTopologyIncomplete(): boolean {
  if (!fs.existsSync(walletsConfigPath()) || !fs.existsSync(masterJsonPath())) {
    return false;
  }
  return isTopologyEmptyOnDisk();
}

function verifyWalletPersistedOnDisk(walletRoot: string, walletId: string): void {
  const secretPath = path.join(walletRoot, `secret_${walletId}.json`);
  if (!fs.existsSync(secretPath)) {
    throw new Error('WALLET_PERSIST_FAILED');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(walletRoot, WALLETS_CONFIG_FILENAME), 'utf8'));
  } catch {
    throw new Error('WALLET_PERSIST_FAILED');
  }
  const wallets = (raw as { wallets?: Record<string, unknown> })?.wallets;
  if (!wallets || typeof wallets !== 'object' || !(walletId in wallets)) {
    throw new Error('WALLET_PERSIST_FAILED');
  }
}

function ensureWalletDir(): void {
  fs.mkdirSync(getWalletRoot(), { recursive: true });
}

const VAULT_PASSWORD_REQUIRED = 'VAULT_PASSWORD_REQUIRED';

function readKvPassword(): string {
  ensureWalletDir();
  const root = getWalletRoot();
  const encPath = path.join(root, KV_PWD_FILE);
  const plainPath = path.join(root, KV_PWD_PLAIN_FILE);

  if (fs.existsSync(encPath)) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        'OS secure storage is unavailable but an encrypted wallet password file exists. '
        + 'Enable keychain/secret service or remove kv-password.bin under your agent wallet dir after backup.',
      );
    }
    const buf = fs.readFileSync(encPath);
    return safeStorage.decryptString(buf);
  }

  if (fs.existsSync(plainPath)) {
    return fs.readFileSync(plainPath, 'utf8').trim();
  }

  const masterPath = path.join(root, 'master.json');
  if (!fs.existsSync(masterPath)) {
    throw new Error('Agent wallet vault is not initialized');
  }

  const runtimePw = loadRuntimeSecretsPassword(root);
  if (runtimePw) {
    try {
      new SecureKVStore(root, runtimePw).verifyPassword();
      return runtimePw;
    } catch {
      // ignore invalid runtime_secrets.json password
    }
  }

  const envPw = process.env.AGENT_WALLET_BAICLAW_PASSWORD?.trim();
  if (envPw) {
    try {
      new SecureKVStore(root, envPw).verifyPassword();
      return envPw;
    } catch {
      // ignore invalid env password
    }
  }

  throw new Error(VAULT_PASSWORD_REQUIRED);
}

/**
 * Persist the user-chosen master password (first-time vault setup from the wizard).
 */
export function persistUserMasterPassword(password: string): void {
  ensureWalletDir();
  const root = getWalletRoot();
  const encPath = path.join(root, KV_PWD_FILE);
  const plainPath = path.join(root, KV_PWD_PLAIN_FILE);
  if (fs.existsSync(plainPath)) {
    try {
      fs.unlinkSync(plainPath);
    } catch {
      // ignore
    }
  }
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(encPath, safeStorage.encryptString(password));
  } else {
    fs.writeFileSync(plainPath, password, 'utf8');
    try {
      fs.chmodSync(plainPath, 0o600);
    } catch {
      // ignore
    }
  }
}

export function isStrongMasterPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

const secretLoader: SecretLoaderFn = (configDir, password, secretRef) => {
  const kv = new SecureKVStore(configDir, password);
  return kv.loadSecret(secretRef);
};

function getProviderWithPassword(password: string): ConfigWalletProvider {
  return new ConfigWalletProvider(getWalletRoot(), password, {
    network: TRON_NETWORK,
    secretLoader,
  });
}

function getProvider(): ConfigWalletProvider {
  return getProviderWithPassword(readKvPassword());
}

function ensureKvInitializedWithPassword(password: string): void {
  ensureWalletDir();
  const root = getWalletRoot();
  const masterPath = path.join(root, 'master.json');
  const kv = new SecureKVStore(root, password);
  if (!fs.existsSync(masterPath)) {
    kv.initMaster();
  } else {
    kv.verifyPassword();
  }
}

function ensureKvInitialized(): void {
  ensureKvInitializedWithPassword(readKvPassword());
}

/**
 * Unlock a CLI-created vault for the GUI: verifies the master password against SecureKVStore
 * and persists it for this app (OS keychain / plain fallback) like the creation wizard.
 */
export function unlockAgentWalletVault(masterPassword: string): void {
  const root = getWalletRoot();
  if (!fs.existsSync(walletsConfigPath())) {
    throw new Error('NO_WALLET_CONFIG');
  }
  const masterPath = path.join(root, 'master.json');
  if (!fs.existsSync(masterPath)) {
    throw new Error('NO_MASTER_VAULT');
  }
  const kv = new SecureKVStore(root, masterPassword);
  kv.verifyPassword();
  persistUserMasterPassword(masterPassword);
}

type WalletMeta = Record<string, { label?: string }>;

function metaPath(): string {
  return path.join(getWalletRoot(), WALLET_META_FILE);
}

function loadWalletMeta(): WalletMeta {
  try {
    const raw = fs.readFileSync(metaPath(), 'utf8');
    const parsed = JSON.parse(raw) as WalletMeta;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveWalletMeta(meta: WalletMeta): void {
  ensureWalletDir();
  fs.writeFileSync(metaPath(), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
}

export function decodeTronPrivateKeyHex(raw: string): Uint8Array {
  const normalized = raw.trim().replace(/^0x/i, '');
  if (normalized.length !== 64 || !/^[0-9a-fA-F]+$/.test(normalized)) {
    throw new Error('INVALID_TRON_PRIVATE_KEY_FORMAT');
  }
  return Uint8Array.from(Buffer.from(normalized, 'hex'));
}

export async function deriveTronAddressFromPrivateKey(privateKeyHex: string): Promise<string> {
  const bytes = decodeTronPrivateKeyHex(privateKeyHex);
  const signer = new TronSigner(bytes, TRON_NETWORK);
  return signer.getAddress();
}

export type ValidateTronKeyResult = {
  ok: boolean;
  errorCode?: 'FORMAT' | 'NOT_TRON' | 'MISMATCH' | 'NO_API_KEY';
  derivedAddress?: string;
  /** When true, BANK OF AI did not return a linked address — binding is not enforced */
  bindingSkipped?: boolean;
};

export async function validateTronPrivateKeyForBankOfAi(
  privateKeyHex: string,
  bankOfAiAccountId: string,
): Promise<ValidateTronKeyResult> {
  let derivedAddress: string;
  try {
    derivedAddress = await deriveTronAddressFromPrivateKey(privateKeyHex);
  } catch {
    return { ok: false, errorCode: 'FORMAT' };
  }

  if (!derivedAddress.startsWith('T')) {
    return { ok: false, errorCode: 'NOT_TRON', derivedAddress };
  }

  const apiKey = await getApiKey(bankOfAiAccountId);
  if (!apiKey) {
    return { ok: false, errorCode: 'NO_API_KEY' };
  }

  const account = await getProviderAccount(bankOfAiAccountId);
  const baseUrl = (account?.baseUrl?.trim() || 'https://api.bankofai.io/v1').replace(/\/$/, '');

  const expected = await fetchBankOfAiLinkedTronAddress(apiKey, baseUrl);
  if (!expected) {
    return { ok: true, derivedAddress, bindingSkipped: true };
  }

  if (expected !== derivedAddress) {
    return { ok: false, errorCode: 'MISMATCH', derivedAddress };
  }

  return { ok: true, derivedAddress, bindingSkipped: false };
}

export interface AgentWalletListItem {
  id: string;
  address: string;
  network: string;
  isActive: boolean;
  label?: string;
}

export type AgentWalletListResult = {
  wallets: AgentWalletListItem[];
  /** True when wallets_config exists but this app has no stored master password (CLI vault). */
  vaultUnlockRequired: boolean;
  /**
   * `wallets` in wallets_config.json is empty while master exists — CLI `list` shows none;
   * usually missing `secret_<id>.json` (import never completed). Re-run the wizard with the same master password.
   */
  vaultTopologyIncomplete: boolean;
};

async function resolveWalletAddress(
  provider: ConfigWalletProvider,
  id: string,
): Promise<{ address: string; network: string } | null> {
  try {
    const wallet = await provider.getWallet(id, TRON_NETWORK);
    const address = await wallet.getAddress();
    return { address, network: TRON_NETWORK };
  } catch {
    try {
      const wallet = await provider.getWallet(id, LEGACY_EVM_NETWORK);
      const address = await wallet.getAddress();
      return { address, network: LEGACY_EVM_NETWORK };
    } catch (err) {
      console.warn(`[agent-wallet] Failed to load wallet ${id}:`, err);
      return null;
    }
  }
}

export async function listAgentWallets(): Promise<AgentWalletListResult> {
  if (!fs.existsSync(walletsConfigPath())) {
    return { wallets: [], vaultUnlockRequired: false, vaultTopologyIncomplete: false };
  }

  const topologyIncomplete = getVaultTopologyIncomplete();

  let password: string;
  try {
    password = readKvPassword();
  } catch (e) {
    if (e instanceof Error && e.message === VAULT_PASSWORD_REQUIRED) {
      return {
        wallets: [],
        vaultUnlockRequired: true,
        vaultTopologyIncomplete: topologyIncomplete,
      };
    }
    throw e;
  }

  ensureKvInitializedWithPassword(password);
  const provider = getProviderWithPassword(password);
  const meta = loadWalletMeta();
  const rows = provider.listWallets();
  const out: AgentWalletListItem[] = [];

  for (const [id, , isActive] of rows) {
    const resolved = await resolveWalletAddress(provider, id);
    if (!resolved) continue;
    if (id !== WALLET_ID) continue;
    out.push({
      id,
      address: resolved.address,
      network: resolved.network,
      isActive,
      label: meta[id]?.label,
    });
  }

  return {
    wallets: out,
    vaultUnlockRequired: false,
    vaultTopologyIncomplete: topologyIncomplete && out.length === 0,
  };
}

export interface CreateTronAgentWalletInput {
  privateKeyHex: string;
  masterPassword: string;
  bankOfAiAccountId: string;
}

export async function createAgentWalletFromTronImport(
  input: CreateTronAgentWalletInput,
): Promise<AgentWalletListItem> {
  if (!isStrongMasterPassword(input.masterPassword)) {
    throw new Error('WEAK_MASTER_PASSWORD');
  }

  const validation = await validateTronPrivateKeyForBankOfAi(
    input.privateKeyHex,
    input.bankOfAiAccountId,
  );
  if (!validation.ok) {
    throw new Error(`VALIDATION_${validation.errorCode ?? 'FORMAT'}`);
  }
  if (!validation.derivedAddress) {
    throw new Error('VALIDATION_FORMAT');
  }

  const walletRoot = getWalletRoot();
  const hasPwdFile =
    fs.existsSync(path.join(walletRoot, KV_PWD_FILE))
    || fs.existsSync(path.join(walletRoot, KV_PWD_PLAIN_FILE));

  if (!hasPwdFile) {
    persistUserMasterPassword(input.masterPassword);
  } else {
    try {
      const kvCheck = new SecureKVStore(walletRoot, input.masterPassword);
      kvCheck.verifyPassword();
    } catch {
      throw new Error('MASTER_PASSWORD_INCORRECT');
    }
  }

  ensureKvInitialized();

  const provider = getProvider();
  if (provider.listWallets().length > 0) {
    throw new Error('WALLET_ALREADY_EXISTS');
  }

  const walletId = WALLET_ID;
  const secretPath = path.join(walletRoot, `secret_${walletId}.json`);

  /**
   * Avoid `ensureStorage()` here: it persists an empty `wallets: {}` when the file is missing.
   * If the app exits before `addWallet`, disk stays empty and matches "list shows nothing".
   * `addWallet` → `persist()` already creates the directory and writes the full topology.
   */
  if (fs.existsSync(secretPath)) {
    provider.addWallet(
      walletId,
      { type: 'local_secure', params: { secret_ref: walletId } },
      { setActiveIfMissing: true },
    );
    const repaired = await provider.getWallet(walletId, TRON_NETWORK);
    const address = await repaired.getAddress();
    verifyWalletPersistedOnDisk(walletRoot, walletId);
    return {
      id: walletId,
      address,
      network: TRON_NETWORK,
      isActive: provider.getActiveId() === walletId,
    };
  }

  const password = readKvPassword();
  const kv = new SecureKVStore(walletRoot, password);
  const pkBytes = decodeTronPrivateKeyHex(input.privateKeyHex);
  kv.saveSecret(walletId, pkBytes);

  provider.addWallet(
    walletId,
    { type: 'local_secure', params: { secret_ref: walletId } },
    { setActiveIfMissing: true },
  );

  const wallet = await provider.getWallet(walletId, TRON_NETWORK);
  const address = await wallet.getAddress();

  verifyWalletPersistedOnDisk(walletRoot, walletId);

  return {
    id: walletId,
    address,
    network: TRON_NETWORK,
    isActive: provider.getActiveId() === walletId,
  };
}

export async function deleteAgentWallet(walletId: string): Promise<void> {
  if (!fs.existsSync(walletsConfigPath())) {
    return;
  }
  ensureKvInitialized();
  const provider = getProvider();
  provider.removeWallet(walletId);

  if (provider.listWallets().length === 0) {
    const root = getWalletRoot();
    try {
      fs.rmSync(root, { recursive: true, force: true });
      clearAgentWalletBaiclawRuntimePassword();
    } catch (err) {
      console.error('[agent-wallet] Failed to remove wallet directory:', err);
      throw err;
    }
    return;
  }

  const meta = loadWalletMeta();
  if (meta[walletId]) {
    delete meta[walletId];
    saveWalletMeta(meta);
  }
}
