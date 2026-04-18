import { getClawXProviderStore } from '../providers/store-instance';
import {
  WEB3_EXCHANGE_DOCS,
  WEB3_EXCHANGES,
  type ExchangeConfigStatus,
  type Web3Exchange,
} from '../../shared/web3';

export type ExchangeSecret = {
  exchange: Web3Exchange;
  accessKey: string;
  secretKey: string;
  updatedAt: string;
};

type ExchangeSecretRecord = Partial<Record<Web3Exchange, ExchangeSecret>>;

async function getExchangeSecrets(): Promise<ExchangeSecretRecord> {
  const store = await getClawXProviderStore();
  return (store.get('exchangeSecrets') ?? {}) as ExchangeSecretRecord;
}

async function setExchangeSecrets(secrets: ExchangeSecretRecord): Promise<void> {
  const store = await getClawXProviderStore();
  store.set('exchangeSecrets', secrets);
}

function maskAccessKey(accessKey: string): string {
  if (accessKey.length <= 8) {
    return '*'.repeat(accessKey.length);
  }
  return `${accessKey.slice(0, 4)}${'*'.repeat(Math.max(4, accessKey.length - 8))}${accessKey.slice(-4)}`;
}

export async function getExchangeSecret(exchange: Web3Exchange): Promise<ExchangeSecret | null> {
  const secrets = await getExchangeSecrets();
  return secrets[exchange] ?? null;
}

export async function setExchangeSecret(
  exchange: Web3Exchange,
  payload: { accessKey: string; secretKey: string },
): Promise<ExchangeSecret> {
  const accessKey = payload.accessKey.trim();
  const secretKey = payload.secretKey.trim();
  if (!accessKey || !secretKey) {
    throw new Error('Access key and secret key are required');
  }

  const secret: ExchangeSecret = {
    exchange,
    accessKey,
    secretKey,
    updatedAt: new Date().toISOString(),
  };
  const secrets = await getExchangeSecrets();
  secrets[exchange] = secret;
  await setExchangeSecrets(secrets);
  return secret;
}

export async function deleteExchangeSecret(exchange: Web3Exchange): Promise<void> {
  const secrets = await getExchangeSecrets();
  delete secrets[exchange];
  await setExchangeSecrets(secrets);
}

export async function listExchangeConfigStatuses(): Promise<ExchangeConfigStatus[]> {
  const secrets = await getExchangeSecrets();
  return WEB3_EXCHANGES.map((exchange) => {
    const secret = secrets[exchange];
    return {
      exchange,
      configured: Boolean(secret?.accessKey && secret?.secretKey),
      accessKeyMasked: secret?.accessKey ? maskAccessKey(secret.accessKey) : undefined,
      docsUrl: WEB3_EXCHANGE_DOCS[exchange],
      updatedAt: secret?.updatedAt,
    };
  });
}

export async function buildExchangeRuntimeEnv(): Promise<Record<string, string>> {
  const secrets = await getExchangeSecrets();
  const env: Record<string, string> = {};

  const binance = secrets.binance;
  if (binance?.accessKey && binance?.secretKey) {
    env.BINANCE_API_KEY = binance.accessKey;
    env.BINANCE_SECRET_KEY = binance.secretKey;
  }

  const htx = secrets.htx;
  if (htx?.accessKey && htx?.secretKey) {
    env.HTX_API_KEY = htx.accessKey;
    env.HTX_SECRET_KEY = htx.secretKey;
  }

  return env;
}
