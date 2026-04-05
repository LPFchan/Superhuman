---
summary: "Install Superhuman via the current OpenClaw compatibility installer, npm/pnpm, source, Docker, and more"
read_when:
  - You need an install method other than the Getting Started quickstart
  - You want to deploy to a cloud platform
  - You need to update, migrate, or uninstall
title: "Install"
---

# Install

Superhuman's runtime identity has moved to Superhuman, but the verified public
installer and npm distribution channels are still OpenClaw-shaped compatibility
surfaces during this migration wave.

## Recommended: compatibility installer script

The fastest way to install. It detects your OS, installs Node if needed,
installs the current public compatibility build, and launches onboarding.

<Tabs>
  <Tab title="macOS / Linux / WSL2">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    ```
  </Tab>
  <Tab title="Windows (PowerShell)">
    ```powershell
    iwr -useb https://openclaw.ai/install.ps1 | iex
    ```
  </Tab>
</Tabs>

To install without running onboarding:

<Tabs>
  <Tab title="macOS / Linux / WSL2">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
    ```
  </Tab>
  <Tab title="Windows (PowerShell)">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    ```
  </Tab>
</Tabs>

<Note>
The `openclaw.ai` installer URLs are intentionally still the verified public
distribution path for now. The runtime itself now defaults to Superhuman-shaped
config and state paths while continuing to read legacy OpenClaw locations for
upgrade compatibility. See [OpenClaw to Superhuman](/install/superhuman-migration)
and [Config and State Migration](/install/config-state-migration).
</Note>

For all flags and CI/automation options, see [Installer internals](/install/installer).

## System requirements

- **Node 24** (recommended) or Node 22.14+ — the installer script handles this automatically
- **macOS, Linux, or Windows** — both native Windows and WSL2 are supported; WSL2 is more stable. See [Windows](/platforms/windows).
- `pnpm` is only needed if you build from source

## Alternative install methods

### npm or pnpm

If you already manage Node yourself:

The currently verified public package channel is still `openclaw`.

<Tabs>
  <Tab title="npm">
    ```bash
    npm install -g openclaw@latest
    openclaw onboard --install-daemon
    ```
  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g openclaw@latest
    pnpm approve-builds -g
    openclaw onboard --install-daemon
    ```

    <Note>
    pnpm requires explicit approval for packages with build scripts. Run `pnpm approve-builds -g` after the first install.
    </Note>

  </Tab>
</Tabs>

<Accordion title="Troubleshooting: sharp build errors (npm)">
  If `sharp` fails due to a globally installed libvips:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
```

</Accordion>

### From source

For contributors or anyone who wants to run from a local checkout:

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install && pnpm ui:build && pnpm build
pnpm link --global
superhuman onboard --install-daemon
```

The linked checkout exposes `superhuman` plus the legacy `openclaw` alias from
this repo. Or skip the link and use `pnpm superhuman ...` from inside the repo.
The workspace package also keeps `pnpm openclaw ...` available as the
compatibility alias. See [Setup](/start/setup) for full development workflows.

### Install from GitHub main

```bash
npm install -g github:openclaw/openclaw#main
```

### Containers and package managers

<CardGroup cols={2}>
  <Card title="Docker" href="/install/docker" icon="container">
    Containerized or headless deployments.
  </Card>
  <Card title="Podman" href="/install/podman" icon="container">
    Rootless container alternative to Docker.
  </Card>
  <Card title="Nix" href="/install/nix" icon="snowflake">
    Declarative install via Nix flake.
  </Card>
  <Card title="Ansible" href="/install/ansible" icon="server">
    Automated fleet provisioning.
  </Card>
  <Card title="Bun" href="/install/bun" icon="zap">
    CLI-only usage via the Bun runtime.
  </Card>
</CardGroup>

## Verify the install

<Tabs>
  <Tab title="Public compatibility install">
    ```bash
    openclaw --version
    openclaw doctor
    openclaw gateway status
    ```
  </Tab>
  <Tab title="Repo-linked checkout">
    ```bash
    superhuman --version
    superhuman doctor
    superhuman gateway status
    ```
  </Tab>
</Tabs>

## Hosting and deployment

Deploy Superhuman on a cloud server or VPS:

<CardGroup cols={3}>
  <Card title="VPS" href="/vps">Any Linux VPS</Card>
  <Card title="Docker VM" href="/install/docker-vm-runtime">Shared Docker steps</Card>
  <Card title="Kubernetes" href="/install/kubernetes">K8s</Card>
  <Card title="Fly.io" href="/install/fly">Fly.io</Card>
  <Card title="Hetzner" href="/install/hetzner">Hetzner</Card>
  <Card title="GCP" href="/install/gcp">Google Cloud</Card>
  <Card title="Azure" href="/install/azure">Azure</Card>
  <Card title="Railway" href="/install/railway">Railway</Card>
  <Card title="Render" href="/install/render">Render</Card>
  <Card title="Northflank" href="/install/northflank">Northflank</Card>
</CardGroup>

## Update, migrate, or uninstall

<CardGroup cols={3}>
  <Card title="Updating" href="/install/updating" icon="refresh-cw">
    Keep the current Superhuman runtime up to date.
  </Card>
  <Card title="Migrating" href="/install/migrating" icon="arrow-right">
    Move to a new machine.
  </Card>
  <Card title="Uninstall" href="/install/uninstall" icon="trash-2">
    Remove the current install completely.
  </Card>
</CardGroup>

## Troubleshooting: CLI not found

If the install succeeded but your CLI is not found in your terminal, check the
binary that matches your install path: `openclaw` for the current public
compatibility install, or `superhuman` for a repo-linked checkout.

```bash
node -v           # Node installed?
npm prefix -g     # Where are global packages?
echo "$PATH"      # Is the global bin dir in PATH?
```

If `$(npm prefix -g)/bin` is not in your `$PATH`, add it to your shell startup file (`~/.zshrc` or `~/.bashrc`):

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

Then open a new terminal. See [Node setup](/install/node) for more details.
