#!/usr/bin/env node

const {
  DEFAULT_RECHARGE_URL,
  getRechargeRequestEnv,
  invokeRechargeMcp,
} = require("./lib/recharge_runtime");

function parseArgs(argv) {
  const args = {
    token: "USDT",
    format: "json",
    url: DEFAULT_RECHARGE_URL,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === "--amount") {
      args.amount = next || "";
      i += 1;
      continue;
    }
    if (token === "--token") {
      args.token = next || "USDT";
      i += 1;
      continue;
    }
    if (token === "--url") {
      args.url = next || DEFAULT_RECHARGE_URL;
      i += 1;
      continue;
    }
    if (token === "--format") {
      if (!next || !["json", "text"].includes(next)) {
        throw new Error("invalid --format <json|text>");
      }
      args.format = next;
      i += 1;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  if (!args.amount) {
    throw new Error("missing --amount");
  }

  return args;
}

function validateEnv(env) {
  if (!env.BANKOFAI_API_KEY) {
    throw new Error("missing BANKOFAI_API_KEY for recharge");
  }
  if (!env.AGENT_WALLET_PASSWORD) {
    throw new Error(
      "missing AGENT_WALLET_PASSWORD. Configure Agent Wallet in baiclaw Settings > Web3 or export AGENT_WALLET_PASSWORD before retrying.",
    );
  }
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const resolvedEnv = getRechargeRequestEnv();
    validateEnv(resolvedEnv);

    Object.assign(process.env, resolvedEnv);

    const result = await invokeRechargeMcp({
      amount: args.amount,
      token: args.token,
      url: args.url,
    });

    if (args.format === "text") {
      process.stdout.write(
        `settlement_status=${result.normalized.settlement_status || "unknown"} `
        + `transaction_hash=${result.normalized.transaction_hash || "n/a"} `
        + `token=${result.normalized.token} amount=${result.normalized.amount} `
        + `post_balance=${result.normalized.post_balance ?? "pending"}\n`,
      );
      return;
    }

    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        usage: "node scripts/recharge.js --amount <value> [--token USDT] [--url https://recharge.bankofai.io/mcp] [--format json|text]",
      })}\n`,
    );
    process.exit(1);
  }
}

main();
