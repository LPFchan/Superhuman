# Superhuman - Personal AI Assistant

<p align="center">
  <a href="https://github.com/LPFchan/Superhuman/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/LPFchan/Superhuman/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="https://github.com/LPFchan/Superhuman/releases"><img src="https://img.shields.io/github/v/release/LPFchan/Superhuman?include_prereleases&style=for-the-badge" alt="GitHub release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

**Superhuman** is a personal AI assistant you run on your own devices. It uses a local-first Gateway for sessions, channels, tools, and web surfaces, and it keeps compatibility with the OpenClaw plugin ecosystem where that compatibility is still part of the migration contract.

It is built for a single-user, operator-controlled setup: local when you want it, remote when you need it, with companion surfaces across macOS, iOS, Android, WebChat, and Canvas.

[Website](https://superhuman.lost.plus) · [Docs](https://superhuman.lost.plus/docs) · [Getting Started](https://superhuman.lost.plus/docs/start/getting-started) · [Migration](https://superhuman.lost.plus/docs/install/superhuman-migration) · [Provenance](PROVENANCE.md) · [Vision](VISION.md)

## Highlights

- Local-first Gateway for sessions, channels, tools, automation, and web surfaces
- Multi-channel messaging across WhatsApp, Telegram, Slack, Discord, Signal, iMessage/BlueBubbles, Matrix, WebChat, and more
- Live Canvas, browser automation, and device nodes for macOS, iOS, and Android
- Multi-agent routing with workspace-backed skills and per-session isolation controls
- OpenClaw plugin ecosystem compatibility during the Superhuman migration wave

## Install

Runtime: **Node 24 (recommended) or Node 22.14+**.

```bash
npm install -g @lpfchan/superhuman@latest
# or: pnpm add -g @lpfchan/superhuman@latest

superhuman onboard --install-daemon
```

The onboarding flow is the recommended setup path on macOS, Linux, and Windows via WSL2.

## Quick start

```bash
superhuman onboard --install-daemon

superhuman gateway --port 18789 --verbose

superhuman message send --to +1234567890 --message "Hello from Superhuman"
superhuman agent --message "Ship checklist" --thinking high
```

Upgrading from an OpenClaw-shaped install? See [Updating](https://superhuman.lost.plus/docs/install/updating) and [OpenClaw to Superhuman migration](https://superhuman.lost.plus/docs/install/superhuman-migration).

## How it works

```text
Channels / WebChat / Apps
           |
           v
+-------------------------------+
|            Gateway            |
|       ws://127.0.0.1:18789    |
+---------------+---------------+
                |
                +-- agent runtime
                +-- CLI
                +-- Control UI
                +-- macOS / iOS / Android nodes
```

## Configuration

Canonical config: `~/.superhuman/superhuman.json`.

```json5
{
  agent: {
    model: "anthropic/claude-opus-4-6",
  },
}
```

Legacy `~/.openclaw/openclaw.json` locations and related state roots are still discovered during the migration wave for upgrade compatibility.

More: [Configuration](https://superhuman.lost.plus/docs/gateway/configuration) · [Config/state migration](https://superhuman.lost.plus/docs/install/config-state-migration) · [Compatibility namespaces](https://superhuman.lost.plus/docs/reference/compatibility-namespaces)

## From source

Prefer `pnpm` for builds from source. Bun is optional for running TypeScript directly.

```bash
git clone https://github.com/LPFchan/Superhuman.git
cd Superhuman

pnpm install
pnpm ui:build
pnpm build

pnpm superhuman onboard --install-daemon
pnpm gateway:watch
```

`pnpm superhuman ...` runs TypeScript directly via `tsx`. `pnpm build` produces `dist/` for Node and the packaged `superhuman` binary.

## Security notes

Superhuman can connect to real messaging surfaces and run tools on your machine. Treat inbound DMs as untrusted input.

- DM pairing is the default for supported messaging channels.
- Approve new senders with `superhuman pairing approve <channel> <code>`.
- For safer multi-user setups, set `agents.defaults.sandbox.mode: "non-main"` so non-main sessions run inside per-session sandboxes.
- Run `superhuman doctor` after upgrades or config changes.

More: [Security](https://superhuman.lost.plus/docs/gateway/security) · [Gateway runbook](https://superhuman.lost.plus/docs/gateway) · [Doctor](https://superhuman.lost.plus/docs/gateway/doctor)

## Docs

- [Getting started](https://superhuman.lost.plus/docs/start/getting-started)
- [Gateway](https://superhuman.lost.plus/docs/gateway)
- [Configuration reference](https://superhuman.lost.plus/docs/gateway/configuration)
- [Channels](https://superhuman.lost.plus/docs/channels)
- [Control UI](https://superhuman.lost.plus/docs/web/control-ui)
- [WebChat](https://superhuman.lost.plus/docs/web/webchat)
- [macOS](https://superhuman.lost.plus/docs/platforms/macos)
- [iOS](https://superhuman.lost.plus/docs/platforms/ios)
- [Android](https://superhuman.lost.plus/docs/platforms/android)
- [Migration](https://superhuman.lost.plus/docs/install/superhuman-migration)
- [Compatibility namespaces](https://superhuman.lost.plus/docs/reference/compatibility-namespaces)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

Superhuman is the public product name. Remaining OpenClaw-shaped names in the repo are limited to provenance and explicit compatibility surfaces.
