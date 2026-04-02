---
name: recharge-skill
description: "BAI account query and recharge skill. Use for requests like 'recharge 1 usdt', '给 BAI 充值 1 USDT', '幫 BAI 儲值 1 USDT', or to query BAI balance/orders. Recharge uses the remote MCP endpoint https://recharge.bankofai.io/mcp with the single `recharge` tool."
version: 1.1.1
dependencies:
  - node >= 18.0.0
  - x402-recharge-server MCP (https://recharge.bankofai.io/mcp)
tags:
  - bankofai
  - balance
  - orders
  - recharge
  - mcp
  - usdt
  - trc20
---

# Recharge Skill

This skill owns the local BAI account query layer and the remote BAI recharge flow. The server must not store the user's account API key.

## When To Use

Use this skill for requests such as:

- `recharge 1 usdt`
- `recharge my BAI account with 1 usdt`
- Chinese requests such as `给 BAI 充值 1 USDT`
- Chinese requests such as `通过 https://recharge.bankofai.io/mcp 给 BAI 充值 1 usdt`
- Traditional Chinese requests such as `幫 BAI 儲值 1 USDT`
- Traditional Chinese requests such as `透過 https://recharge.bankofai.io/mcp 幫 BAI 儲值 1 USDT`
- Traditional Chinese requests such as `查詢我的 BAI 餘額`
- Traditional Chinese requests such as `列出我最近的 BAI 訂單`
- `check my BAI balance`
- `list my BAI orders`

## Scope

- The BAI API key is managed by the local agent / skill.
- Balance and order queries should call BAI directly from local scripts.
- Recharge and payment flows should use the remote MCP endpoint `https://recharge.bankofai.io/mcp`.
- Use the MCP tool `recharge` for all supported recharge routes such as `USDT`.
- Do not use native `TRX` recharge flows from this skill.
- If the requested token is not a supported TRC20 token, return the server validation error to the user.

## Recharge Flow

For a request like `recharge 1 usdt`, use the remote MCP endpoint directly and call:

- `recharge(amount="1", token="USDT")`

Return the settlement status, transaction hash, token, and amount to the user after the MCP call completes.

## Local Configuration

This skill is configured for BAI production.

Resolution order:

1. CLI arguments
2. Environment variables
3. `bankofai-config.json`
4. `~/.bankofai/config.json`
5. `~/.mcporter/bankofai-config.json`
6. `~/.openclaw/openclaw.json` → `skills.entries["recharge-skill"].env`

See `bankofai-config.example.json` for an example.

Supported fields:

- `api_key`
- `base_url`
- `timeout_ms`

Recommended production value:

- `base_url = https://chat.ainft.com`

## Available Scripts

- Always run the scripts from this skill directory, not from the current workspace.
- Prefer absolute paths so the agent does not accidentally execute a same-named stub under `~/.openclaw/workspace/scripts/`.
- `node ~/.openclaw/skills/recharge-skill/scripts/recharge.js --amount 1 --token USDT --format json`
  - Calls the remote MCP recharge endpoint with x402 payment using the local Agent Wallet
- `node ~/.openclaw/skills/recharge-skill/scripts/check_balance.js --format json`
  - Query the user's point balance with `api_key`
- `node ~/.openclaw/skills/recharge-skill/scripts/check_orders.js --format json`
  - Query `order.listOrders`
