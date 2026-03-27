import type { IncomingMessage, ServerResponse } from 'http';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { getAgentWalletBaiclawPassword, setAgentWalletBaiclawPassword } from '../../services/secrets/app-secret-store';
import { getAgentWalletRuntimeConfig } from '../../utils/agent-wallet';
import { setSetting } from '../../utils/store';

async function restartGatewayIfRunning(ctx: HostApiContext): Promise<void> {
  if (ctx.gatewayManager.getStatus().state === 'running') {
    await ctx.gatewayManager.restart();
  }
}

export async function handleAgentWalletRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  if (url.pathname === '/api/agent-wallet/config' && req.method === 'GET') {
    sendJson(res, 200, await getAgentWalletRuntimeConfig());
    return true;
  }

  if (url.pathname === '/api/agent-wallet/config' && req.method === 'PUT') {
    try {
      const body = await parseJsonBody<{
        password?: string;
        selectedWalletId?: string;
      }>(req);

      if (body.selectedWalletId !== undefined) {
        await setSetting('agentWalletSelectedWalletId', body.selectedWalletId.trim() || 'baiclaw_wallet');
      }

      let passwordChanged = false;
      if (body.password !== undefined) {
        const previous = await getAgentWalletBaiclawPassword();
        const next = body.password.trim();
        if ((previous ?? '') !== next) {
          passwordChanged = true;
        }
        await setAgentWalletBaiclawPassword(body.password);
      }

      if (passwordChanged) {
        await restartGatewayIfRunning(ctx);
      }

      sendJson(res, 200, {
        success: true,
        config: await getAgentWalletRuntimeConfig(),
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
