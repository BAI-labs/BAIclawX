# binance-web3-pack

Managed Binance trading pack bundled with BAIclaw.

This pack expects the main process to inject the following environment variables at runtime:

- `BINANCE_API_KEY`
- `BINANCE_SECRET_KEY`

The credentials are configured in BAIclaw Settings > Web3 and are never written into `~/.openclaw/openclaw.json`.

- Distribution: bundled locally by BAIclaw
- Access: gated by Web3 entitlement
- Docs: https://github.com/binance/binance-skills-hub
