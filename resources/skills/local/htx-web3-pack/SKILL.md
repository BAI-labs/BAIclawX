# htx-web3-pack

Managed HTX trading pack bundled with BAIclaw.

This pack expects the main process to inject the following environment variables at runtime:

- `HTX_API_KEY`
- `HTX_SECRET_KEY`

The credentials are configured in BAIclaw Settings > Web3 and are never written into `~/.openclaw/openclaw.json`.

- Distribution: bundled locally by BAIclaw
- Access: gated by Web3 entitlement
- Docs: https://github.com/htx-exchange/htx-skills-hub
