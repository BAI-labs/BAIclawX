# BAIclaw

**Your Personal AI Agent, Right on Your Desktop.**

BAIclaw is a personal AI agent desktop application built on [OpenClaw](https://openclaw.ai/) and [ClawX](https://github.com/ValueCell-ai/ClawX). It wraps the power of the OpenClaw agent runtime in a graphical interface — no command line, no config files, just a ready-to-use AI assistant.

## Installation

#### Download a Pre-built Release

If you just want to use BAIclaw, download the latest package for your platform from the [Releases](https://github.com/BAI-labs/BAIclawX/releases) page.

#### Run from Source

If you are developing locally or want to build the app yourself, use the steps below:

```bash
# Clone the repository
git clone https://github.com/BAI-labs/BAIclawX
cd BAIclawX

# Install dependencies and download uv
pnpm run init

# Start the app in development mode
pnpm dev
```


## ✨ Features

### 🤖 Multi-Agent Collaboration

Configure multiple specialized agents, each with independent system prompts and context memory. Switch between them instantly with the `@agent` command — route the right task to the right agent.

### 💬 Multi-Channel Communication

Extend your AI beyond the desktop. Connect to the platforms you already use:

| Platform | Connection Method |
|----------|-------------------|
| **Telegram** | Bot Token via @BotFather |
| **Discord** | Bot application via Developer Portal |
| **WhatsApp** | QR code scan from your phone |
| **Feishu** | One-click robot creation |
| **DingTalk** | Robot via Developer Platform |
| **WeCom** | Smart Robot in API mode |
| **QQ Bot** | Quick registration via QQ Bot portal |

Each channel operates independently and can bind to different agents.

### 🧩 Plug-and-Play Skills

Install capability extensions directly from the built-in skill panel — no package manager required. BAIclaw ships with document processing (PDF, Excel, Word, PPT) and web search skills out of the box.

### ⏱️ Automated Workflows

Create scheduled tasks that run 7×24 without manual intervention. Set custom triggers, use preset templates, and let your agents work while you sleep.

### 💰 Agent Wallet

A locally secured Web3 wallet designed for AI agents. Once configured, your agent can autonomously execute on-chain operations — transfers, token swaps, liquidity management, and x402 protocol payments. Keys are encrypted and stored locally, never uploaded to any server.

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│           BAIclaw (GUI)             │  ← Graphical Interface
├─────────────────────────────────────┤
│            OpenClaw                 │  ← Agent Runtime & Extensions
├─────────────────────────────────────┤
│           BAI LLM API               │  ← Intelligence Source
└─────────────────────────────────────┘
```

## 🚀 Quick Start

### Requirements

- macOS 11+ with 4GB+ RAM

### Steps

1. **Install** — Download and install BAIclaw
2. **Setup Wizard** — Follow the first-launch wizard to complete initial configuration
3. **Get API Key** — Register at [BAI](https://chat.b.ai/chat) and create an API Key
4. **Start Chatting** — Open the Chat page and talk to your agent

> ⚠️ If you have previously installed OpenClaw or ClawX, we recommend uninstalling and removing the config directory (`~/.openclaw`) to avoid conflicts.

## 🛠️ Packaging

Desktop packaging now validates the bundled OpenClaw runtime before `electron-builder` runs. The validation checks that runtime-loaded modules such as `@whiskeysockets/baileys`, `pino`, `protobufjs`, and `qrcode-terminal` can be resolved from `build/openclaw`.

- Run `pnpm run verify:openclaw-bundle` to validate an existing OpenClaw bundle.
- `pnpm run build`, `pnpm run package`, `pnpm run package:mac`, `pnpm run package:win`, `pnpm run package:linux`, and `pnpm run release` all include this validation automatically.


## 🔗 Related Projects

- [OpenClaw](https://github.com/openclaw/openclaw) — The agent runtime that powers BAIclaw
- [ClawX](https://github.com/ValueCell-ai/ClawX) — Desktop application framework
- [OpenClaw Docs](https://docs.openclaw.ai/) — OpenClaw official documentation
