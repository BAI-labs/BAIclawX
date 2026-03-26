import type { IncomingMessage, ServerResponse } from 'http';
import {
  createAgentWalletFromTronImport,
  deleteAgentWallet,
  getAgentWalletStoragePath,
  listAgentWallets,
  setAgentWalletBaiclawRuntimePassword,
  unlockAgentWalletVault,
  validateTronPrivateKeyForBankOfAi,
} from '../../services/agent-wallet/agent-wallet-service';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson, sendNoContent } from '../route-utils';
import { logger } from '../../utils/logger';

export async function handleAgentWalletRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {

  if (url.pathname === '/api/agent-wallets' && req.method === 'GET') {
    try {
      const { wallets, vaultUnlockRequired, vaultTopologyIncomplete } = await listAgentWallets();
      sendJson(res, 200, {
        success: true,
        wallets,
        vaultUnlockRequired,
        vaultTopologyIncomplete,
        storagePath: getAgentWalletStoragePath(),
      });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/agent-wallets/runtime-baiclaw-password' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ masterPassword?: string }>(req);
      const masterPassword = body.masterPassword ?? '';
      if (!masterPassword) {
        sendJson(res, 400, { success: false, error: 'Missing masterPassword' });
        return true;
      }
      setAgentWalletBaiclawRuntimePassword(masterPassword);
      try {
        await ctx.gatewayManager.restart();
      } catch (err) {
        logger.warn('Gateway restart after AGENT_WALLET_BAICLAW_PASSWORD update failed:', err);
      }
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/agent-wallets/unlock' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ masterPassword?: string }>(req);
      const masterPassword = body.masterPassword ?? '';
      if (!masterPassword) {
        sendJson(res, 400, { success: false, error: 'Missing masterPassword' });
        return true;
      }
      unlockAgentWalletVault(masterPassword);
      setAgentWalletBaiclawRuntimePassword(masterPassword);
      try {
        await ctx.gatewayManager.restart();
      } catch (err) {
        logger.warn('Gateway restart after vault unlock failed:', err);
      }
      sendJson(res, 200, { success: true });
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      const prefix = message.replace(/^Error:\s*/, '');
      if (prefix === 'NO_WALLET_CONFIG' || prefix === 'NO_MASTER_VAULT') {
        sendJson(res, 400, { success: false, error: prefix });
        return true;
      }
      sendJson(res, 401, { success: false, error: 'MASTER_PASSWORD_INCORRECT' });
    }
    return true;
  }

  if (url.pathname === '/api/agent-wallets/validate-private-key' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ privateKey?: string; bankOfAiAccountId?: string }>(req);
      const privateKey = body.privateKey?.trim() ?? '';
      const bankOfAiAccountId = body.bankOfAiAccountId?.trim() ?? '';
      if (!privateKey || !bankOfAiAccountId) {
        sendJson(res, 400, { success: false, error: 'Missing privateKey or bankOfAiAccountId' });
        return true;
      }
      const result = await validateTronPrivateKeyForBankOfAi(privateKey, bankOfAiAccountId);
      sendJson(res, 200, { success: true, ...result });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  if (url.pathname === '/api/agent-wallets' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{
        privateKey?: string;
        masterPassword?: string;
        bankOfAiAccountId?: string;
      }>(req);
      const privateKey = body.privateKey?.trim() ?? '';
      const masterPassword = body.masterPassword ?? '';
      const bankOfAiAccountId = body.bankOfAiAccountId?.trim() ?? '';
      if (!privateKey || !masterPassword || !bankOfAiAccountId) {
        sendJson(res, 400, { success: false, error: 'Missing privateKey, masterPassword, or bankOfAiAccountId' });
        return true;
      }
      const wallet = await createAgentWalletFromTronImport({
        privateKeyHex: privateKey,
        masterPassword,
        bankOfAiAccountId,
      });
      sendJson(res, 200, {
        success: true,
        wallet,
        storagePath: getAgentWalletStoragePath(),
      });
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      const codeMap: Record<string, number> = {
        WEAK_MASTER_PASSWORD: 400,
        VALIDATION_FORMAT: 400,
        VALIDATION_NOT_TRON: 400,
        VALIDATION_MISMATCH: 400,
        VALIDATION_NO_API_KEY: 400,
        WALLET_ALREADY_EXISTS: 409,
        MASTER_PASSWORD_INCORRECT: 401,
        WALLET_PERSIST_FAILED: 500,
      };
      const prefix = message.replace(/^Error:\s*/, '');
      const status = codeMap[prefix] ?? 500;
      sendJson(res, status, { success: false, error: prefix });
    }
    return true;
  }

  if (url.pathname.startsWith('/api/agent-wallets/') && req.method === 'DELETE') {
    const suffix = url.pathname.slice('/api/agent-wallets/'.length).split('/').filter(Boolean)[0];
    if (!suffix) {
      sendJson(res, 400, { success: false, error: 'Missing wallet id' });
      return true;
    }
    const walletId = decodeURIComponent(suffix);
    try {
      await deleteAgentWallet(walletId);
      sendNoContent(res);
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
