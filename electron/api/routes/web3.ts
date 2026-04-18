import type { IncomingMessage, ServerResponse } from 'http';
import { parseJsonBody, sendJson } from '../route-utils';
import type { HostApiContext } from '../context';
import { getWeb3Entitlement } from '../../services/web3/entitlements';
import {
  deleteExchangeSecret,
  listExchangeConfigStatuses,
  setExchangeSecret,
} from '../../services/secrets/exchange-secret-store';
import { listManagedWeb3PackStates } from '../../services/web3/managed-web3';
import { WEB3_EXCHANGES, type Web3Exchange } from '../../shared/web3';

function isWeb3Exchange(value: string): value is Web3Exchange {
  return WEB3_EXCHANGES.includes(value as Web3Exchange);
}

export async function handleWeb3Routes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/entitlements/web3' && req.method === 'GET') {
    sendJson(res, 200, await getWeb3Entitlement());
    return true;
  }

  if (url.pathname === '/api/web3/exchanges' && req.method === 'GET') {
    sendJson(res, 200, { exchanges: await listExchangeConfigStatuses() });
    return true;
  }

  if (url.pathname === '/api/web3/managed-packs' && req.method === 'GET') {
    sendJson(res, 200, { packs: await listManagedWeb3PackStates() });
    return true;
  }

  if (url.pathname.startsWith('/api/web3/exchanges/') && req.method === 'PUT') {
    const exchange = decodeURIComponent(url.pathname.slice('/api/web3/exchanges/'.length));
    if (!isWeb3Exchange(exchange)) {
      sendJson(res, 404, { success: false, error: `Unsupported exchange: ${exchange}` });
      return true;
    }
    try {
      const entitlement = await getWeb3Entitlement();
      if (!entitlement.canUseManagedWeb3Skills) {
        sendJson(res, 403, { success: false, error: 'Web3 exchange configuration is locked for the current tier' });
        return true;
      }
      const body = await parseJsonBody<{ accessKey?: string; secretKey?: string }>(req);
      await setExchangeSecret(exchange, {
        accessKey: body.accessKey ?? '',
        secretKey: body.secretKey ?? '',
      });
      if (ctx.gatewayManager.getStatus().state === 'running') {
        await ctx.gatewayManager.restart();
      }
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname.startsWith('/api/web3/exchanges/') && req.method === 'DELETE') {
    const exchange = decodeURIComponent(url.pathname.slice('/api/web3/exchanges/'.length));
    if (!isWeb3Exchange(exchange)) {
      sendJson(res, 404, { success: false, error: `Unsupported exchange: ${exchange}` });
      return true;
    }
    try {
      const entitlement = await getWeb3Entitlement();
      if (!entitlement.canUseManagedWeb3Skills) {
        sendJson(res, 403, { success: false, error: 'Web3 exchange configuration is locked for the current tier' });
        return true;
      }
      await deleteExchangeSecret(exchange);
      if (ctx.gatewayManager.getStatus().state === 'running') {
        await ctx.gatewayManager.restart();
      }
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
