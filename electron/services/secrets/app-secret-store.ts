import { getClawXProviderStore } from '../providers/store-instance';

const AGENT_WALLET_BAICLAW_PASSWORD_KEY = 'agentWalletBaiclawPassword';

async function getAppSecrets(): Promise<Record<string, string>> {
  const store = await getClawXProviderStore();
  return (store.get('appSecrets') ?? {}) as Record<string, string>;
}

async function setAppSecrets(secrets: Record<string, string>): Promise<void> {
  const store = await getClawXProviderStore();
  store.set('appSecrets', secrets);
}

export async function getAgentWalletBaiclawPassword(): Promise<string | null> {
  const secrets = await getAppSecrets();
  const value = secrets[AGENT_WALLET_BAICLAW_PASSWORD_KEY];
  return typeof value === 'string' && value.trim() ? value : null;
}

export async function setAgentWalletBaiclawPassword(password: string): Promise<void> {
  const trimmed = password.trim();
  const secrets = await getAppSecrets();
  if (trimmed) {
    secrets[AGENT_WALLET_BAICLAW_PASSWORD_KEY] = trimmed;
  } else {
    delete secrets[AGENT_WALLET_BAICLAW_PASSWORD_KEY];
  }
  await setAppSecrets(secrets);
}

export async function deleteAgentWalletBaiclawPassword(): Promise<void> {
  const secrets = await getAppSecrets();
  delete secrets[AGENT_WALLET_BAICLAW_PASSWORD_KEY];
  await setAppSecrets(secrets);
}
