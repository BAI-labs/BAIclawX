import { join } from 'path';
import { getOpenClawConfigDir } from './paths';
import { getAgentWalletBaiclawPassword } from '../services/secrets/app-secret-store';
import { getSetting } from './store';

export const AGENT_WALLET_DIR_ENV_KEY = 'AGENT_WALLET_DIR';
export const AGENT_WALLET_PASSWORD_ENV_KEY = 'AGENT_WALLET_PASSWORD';
export const AGENT_WALLET_BAICLAW_PASSWORD_ENV_KEY = 'AGENT_WALLET_BAICLAW_PASSWORD';
export const AGENT_WALLET_BAICLAW_DIRNAME = 'agent-wallet-baiclaw';
export const DEFAULT_BAICLAW_WALLET_ID = 'baiclaw_wallet';

export function getAgentWalletBaiclawDir(): string {
  return join(getOpenClawConfigDir(), AGENT_WALLET_BAICLAW_DIRNAME);
}

export async function getAgentWalletSelectedWalletId(): Promise<string> {
  const value = await getSetting('agentWalletSelectedWalletId');
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || DEFAULT_BAICLAW_WALLET_ID;
}

export async function getAgentWalletRuntimeConfig(): Promise<{
  walletDir: string;
  defaultWalletId: string;
  selectedWalletId: string;
  hasPassword: boolean;
}> {
  const password = await getAgentWalletBaiclawPassword();
  return {
    walletDir: getAgentWalletBaiclawDir(),
    defaultWalletId: DEFAULT_BAICLAW_WALLET_ID,
    selectedWalletId: await getAgentWalletSelectedWalletId(),
    hasPassword: Boolean(password),
  };
}

export async function loadAgentWalletRuntimeEnv(): Promise<Record<string, string>> {
  const env: Record<string, string> = {
    [AGENT_WALLET_DIR_ENV_KEY]: getAgentWalletBaiclawDir(),
  };

  const password = await getAgentWalletBaiclawPassword();
  if (password) {
    env[AGENT_WALLET_PASSWORD_ENV_KEY] = password;
    // Keep an app-specific alias available for future wrappers or diagnostics.
    env[AGENT_WALLET_BAICLAW_PASSWORD_ENV_KEY] = password;
  }

  return env;
}
