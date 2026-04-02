#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { getConfig } = require("./bankofai_config");

const BAICLAW_PROVIDER_STORE_PATH = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "baiclaw",
  "clawx-providers.json",
);
const X402_PAYMENT_ROOT = path.join(os.homedir(), ".openclaw", "skills", "x402-payment");
const X402_MODULE_PATH = path.join(X402_PAYMENT_ROOT, "node_modules", "@bankofai", "x402", "dist", "index.js");
const X402_AGENT_WALLET_PATH = path.join(X402_PAYMENT_ROOT, "node_modules", "@bankofai", "agent-wallet", "dist", "index.js");
const DEFAULT_RECHARGE_URL = "https://recharge.bankofai.io/mcp";
const DEFAULT_WALLET_DIR = path.join(os.homedir(), ".openclaw", "agent-wallet-baiclaw");
const DEFAULT_BALANCE_TIMEOUT_MS = 10_000;
const POST_RECHARGE_BALANCE_RETRY_MS = [0, 1500, 3000];

function loadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_) {
    return null;
  }
}

function getBaiclawProviderStore() {
  return loadJson(BAICLAW_PROVIDER_STORE_PATH) || {};
}

function getStoredWalletPassword() {
  const store = getBaiclawProviderStore();
  const password = store && store.appSecrets ? store.appSecrets.agentWalletBaiclawPassword : "";
  return typeof password === "string" ? password.trim() : "";
}

function getWalletEnv() {
  const password = process.env.AGENT_WALLET_PASSWORD
    || process.env.AGENT_WALLET_BAICLAW_PASSWORD
    || getStoredWalletPassword();
  return {
    AGENT_WALLET_DIR: process.env.AGENT_WALLET_DIR || DEFAULT_WALLET_DIR,
    AGENT_WALLET_PASSWORD: password,
    AGENT_WALLET_BAICLAW_PASSWORD: process.env.AGENT_WALLET_BAICLAW_PASSWORD || password,
  };
}

function getRechargeRequestEnv(overrides = {}) {
  const bank = getConfig(overrides);
  const wallet = getWalletEnv();
  return {
    BANKOFAI_API_KEY: bank.apiKey,
    BANKOFAI_BASE_URL: bank.baseUrl,
    AGENT_WALLET_DIR: wallet.AGENT_WALLET_DIR,
    AGENT_WALLET_PASSWORD: wallet.AGENT_WALLET_PASSWORD,
    AGENT_WALLET_BAICLAW_PASSWORD: wallet.AGENT_WALLET_BAICLAW_PASSWORD,
  };
}

function buildInitializePayload() {
  return {
    jsonrpc: "2.0",
    id: "initialize",
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: {
        name: "baiclaw-recharge-skill",
        version: "1.0.0",
      },
    },
  };
}

function buildRechargePayload(amount, token) {
  return {
    jsonrpc: "2.0",
    id: "recharge",
    method: "tools/call",
    params: {
      name: "recharge",
      arguments: {
        amount: String(amount),
        token: String(token).toUpperCase(),
      },
    },
  };
}

function normalizeMcpToolResult(body, fallbackToken, fallbackAmount) {
  const result = body && typeof body === "object" ? body.result : null;
  const structured = result && typeof result.structuredContent === "object" ? result.structuredContent : null;
  const content = result && Array.isArray(result.content) ? result.content : [];
  const textContent = content
    .filter((item) => item && item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();

  return {
    settlement_status: structured && (structured.settlement_status || structured.status) || null,
    transaction_hash: structured && (structured.transaction_hash || structured.tx_hash || structured.transaction) || null,
    token: structured && structured.token || fallbackToken,
    amount: structured && structured.amount || String(fallbackAmount),
    raw: body,
    text: textContent || null,
  };
}

function shouldFetchPostRechargeBalance(normalized) {
  const status = String(normalized && normalized.settlement_status || "").trim().toLowerCase();
  return ["paid", "settled", "success", "completed"].includes(status);
}

function trpcInput() {
  return encodeURIComponent(
    JSON.stringify({
      0: {
        json: null,
        meta: { values: ["undefined"], v: 1 },
      },
    }),
  );
}

async function fetchJson(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = { raw: text };
    }
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function parsePointsBalanceFromTrpcResult(userResult) {
  if (!userResult || !userResult.ok) {
    return null;
  }

  const item = Array.isArray(userResult.data) ? userResult.data[0] : userResult.data;
  const payload = item && item.result && item.result.data ? item.result.data : {};
  const resolved = payload && payload.json ? payload.json : payload;
  const pointsBalance = resolved && resolved.points_balance;

  return Number.isFinite(pointsBalance) ? pointsBalance : null;
}

async function queryUserBalance(config) {
  if (!config.apiKey) {
    throw new Error("missing BANKOFAI_API_KEY or bankofai-config.json api_key");
  }

  const url = `${config.baseUrl}/trpc/lambda/usage.points?batch=1&input=${trpcInput()}`;
  return fetchJson(
    url,
    {
      headers: {
        Accept: "*/*",
        Authorization: `Bearer ${config.apiKey}`,
      },
    },
    config.timeoutMs || DEFAULT_BALANCE_TIMEOUT_MS,
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPostRechargeBalance(overrides = {}) {
  const config = getConfig(overrides);
  for (let index = 0; index < POST_RECHARGE_BALANCE_RETRY_MS.length; index += 1) {
    const waitMs = POST_RECHARGE_BALANCE_RETRY_MS[index];
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    const userResult = await queryUserBalance(config);
    const pointsBalance = parsePointsBalanceFromTrpcResult(userResult);
    if (pointsBalance !== null) {
      return {
        ok: true,
        points_balance: pointsBalance,
        unit: "points",
        http_status: userResult.status,
        attempts: index + 1,
      };
    }
  }

  return {
    ok: false,
    points_balance: null,
    unit: "points",
    attempts: POST_RECHARGE_BALANCE_RETRY_MS.length,
  };
}

function enrichWalletError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("MAC mismatch")) {
    return new Error(
      "Agent Wallet vault password mismatch. The stored baiclaw wallet password does not unlock ~/.openclaw/agent-wallet-baiclaw. Re-enter the correct master password in Settings > Web3 before retrying recharge.",
    );
  }
  return error instanceof Error ? error : new Error(message);
}

async function createX402Client() {
  const x402 = await import(pathToFileURL(X402_MODULE_PATH).href);
  await import(pathToFileURL(X402_AGENT_WALLET_PATH).href);

  const {
    TronClientSigner,
    EvmClientSigner,
    X402Client,
    X402FetchClient,
    ExactTronClientMechanism,
    ExactEvmClientMechanism,
    ExactPermitTronClientMechanism,
    ExactPermitEvmClientMechanism,
    ExactGasFreeClientMechanism,
    GasFreeAPIClient,
    GASFREE_API_BASE_URLS,
    SufficientBalancePolicy,
  } = x402;

  let tronSigner;
  try {
    tronSigner = await TronClientSigner.create();
  } catch (error) {
    throw enrichWalletError(error);
  }

  let evmSigner;
  try {
    evmSigner = await EvmClientSigner.create();
  } catch (error) {
    evmSigner = null;
  }

  const client = new X402Client();
  const gasFreeClients = {};
  for (const [networkId, baseUrl] of Object.entries(GASFREE_API_BASE_URLS || {})) {
    gasFreeClients[networkId] = new GasFreeAPIClient(baseUrl);
  }

  if (tronSigner) {
    for (const net of ["mainnet", "nile", "shasta", "*"]) {
      const networkId = net === "*" ? "tron:*" : `tron:${net}`;
      client.register(networkId, new ExactTronClientMechanism(tronSigner));
      client.register(networkId, new ExactPermitTronClientMechanism(tronSigner));
      client.register(networkId, new ExactGasFreeClientMechanism(tronSigner, gasFreeClients));
    }
  }

  if (evmSigner) {
    client.register("eip155:*", new ExactEvmClientMechanism(evmSigner));
    client.register("eip155:*", new ExactPermitEvmClientMechanism(evmSigner));
  }

  client.registerPolicy(new SufficientBalancePolicy(client));

  return new X402FetchClient(client);
}

async function postJson(fetchClient, url, body, headers = {}) {
  const response = await fetchClient.request(url, {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_) {
    parsed = { raw: text };
  }

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: parsed,
  };
}

async function invokeRechargeMcp({ amount, token, url = DEFAULT_RECHARGE_URL }) {
  const fetchClient = await createX402Client();
  const initResponse = await postJson(fetchClient, url, buildInitializePayload());
  const sessionId = initResponse.headers["mcp-session-id"] || "";

  const toolResponse = await postJson(
    fetchClient,
    url,
    buildRechargePayload(amount, token),
    sessionId ? { "mcp-session-id": sessionId } : {},
  );

  const normalized = normalizeMcpToolResult(toolResponse.body, String(token).toUpperCase(), amount);
  const postBalance = shouldFetchPostRechargeBalance(normalized)
    ? await fetchPostRechargeBalance()
    : null;

  return {
    initialize: initResponse,
    recharge: toolResponse,
    normalized: {
      ...normalized,
      post_balance: postBalance && postBalance.ok ? postBalance.points_balance : null,
      post_balance_unit: postBalance ? postBalance.unit : null,
      balance_refresh_pending: Boolean(postBalance) && !postBalance.ok,
    },
    post_balance: postBalance,
  };
}

module.exports = {
  DEFAULT_RECHARGE_URL,
  buildInitializePayload,
  buildRechargePayload,
  getRechargeRequestEnv,
  getStoredWalletPassword,
  getWalletEnv,
  invokeRechargeMcp,
  parsePointsBalanceFromTrpcResult,
  queryUserBalance,
  fetchPostRechargeBalance,
  normalizeMcpToolResult,
  shouldFetchPostRechargeBalance,
};
