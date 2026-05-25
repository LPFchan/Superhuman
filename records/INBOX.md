# Superhuman Inbox

This file is an ephemeral scratch disk for unresolved intake and routing items.

Rules:

- Keep it easy to append to from messenger, operator notes, or agent capture.
- Remove entries once they are reflected into durable repo artifacts.
- Keep the stable `IBX-*` id even after the inbox entry is later deleted.
- Do not treat this file as durable truth.

## Active Intake

### `IBX-20260412-001` Potential mobile surface references

- Opened: `2026-04-12 09-36-01 KST`
- Recorded by agent: `019d7499-e2cb-7923-ad65-19a4bdb04d64`
- Source: operator capture
- Status: unrouted
- Summary: capture a small cluster of mobile and cross-device references that may inform Superhuman's future mobile cockpit, remote delegation, and phone-to-desktop execution model.
- Links:
  - `https://github.com/getpaseo/paseo`
  - `https://letta.com/`
  - `https://github.com/lunel-dev/lunel`
  - `https://github.com/dnakov/litter`
  - `https://github.com/slopus/happy`
  - `https://support.claude.com/en/articles/13947068-assign-tasks-from-anywhere-in-claude-cowork`
- Captured takeaways:
  - Paseo: self-hosted daemon model with desktop, mobile, web, and CLI clients around the same running agents; explicitly frames cross-device agent control, QR-based phone pairing, remote daemon access, and follow-up messaging to active agents.
  - Letta Code: memory-first agent product that emphasizes persistent agents, viewable or editable memory, and remote control of agents across devices and environments rather than a phone-local IDE.
  - Lunel: AI-powered mobile IDE plus cloud-development posture; Expo mobile app acts as a relatively thin client over a local-machine CLI plus relay/proxy stack, with QR pairing, terminal, files, git, and process management.
  - Litter: native iOS and Android Codex client with local or remote server connectivity, realtime voice, session management, and a shared Rust core across mobile platforms.
  - Happy: mobile and web client for Claude Code and Codex with a CLI wrapper (`happy claude` / `happy codex`), push notifications, one-key device handoff, end-to-end encryption, and an explicit computer-plus-phone remote-control model rather than a phone-local IDE.
  - Claude Cowork Dispatch: product pattern for assigning work from mobile into a persistent desktop-backed thread, with push notifications, cross-surface continuity, remote desktop capabilities, and explicit safety caveats around phone-triggered desktop actions.
- Possible routing angle:
  - mobile cockpit vs mobile IDE boundary
  - persistent thread or run continuity across phone and desktop
  - remote-control model for desktop or daemon-backed work from mobile
  - trust and safety posture for mobile-triggered actions on desktop or connected services

### `IBX-20260415-001` Lody cross-surface package reference

- Opened: `2026-04-15 03-29-08 KST`
- Recorded by agent: `019d7f48-1684-7471-85b0-a773926fe32a`
- Source: operator capture plus product site
- Status: unrouted
- Summary: capture `Lody` as a broader cross-surface package reference rather than just a mobile client: desktop, web, and mobile access around parallel agent operation, team workflows, and daemon-backed runtime control.
- Links:
  - `https://lody.ai/`
- Captured takeaways:
  - Lody positions itself around running agents in parallel, safely, with a team rather than as a narrow mobile companion.
  - The public docs and navigation explicitly span mobile access, team support, worktrees, diff comments, file lists, notifications, local projects, sessions, session tabs, GitHub integration, and CLI runtime types.
  - The landing page foregrounds a daemon-style local command (`npx lody daemon start`), which suggests a computer-hosted runtime with remote surfaces layered on top rather than a phone-local IDE.
  - This makes Lody relevant as a whole-package reference for cross-surface agent operation, not just as a PWA or mobile-side artifact.
- Possible routing angle:
  - one product spanning desktop, web, and mobile around the same running agents
  - daemon-backed runtime with multiple remote control surfaces
  - team-aware parallel-agent workflows
  - how much of Superhuman should be product-package versus single-surface app

### `IBX-20260415-002` Open Agents cloud-agent control-plane reference

- Opened: `2026-04-15 03-32-42 KST`
- Recorded by agent: `019d7f48-1684-7471-85b0-a773926fe32a`
- Source: operator capture plus referenced GitHub repo
- Status: unrouted
- Summary: capture `vercel-labs/open-agents` as a desktop-adjacent reference for cloud-agent architecture, durable workflow orchestration, and the separation between agent control plane and sandbox runtime.
- Links:
  - `https://github.com/vercel-labs/open-agents`
  - `https://open-agents.dev`
- Captured takeaways:
  - Open Agents is explicitly framed as an open-source reference app for building and running background coding agents on Vercel, meant to be forked and adapted rather than treated as a black box.
  - Its core architectural claim is that the `agent is not the sandbox`: the agent runs outside the VM as a durable workflow, while the sandbox is a separately managed execution environment for filesystem, shell, git, and preview ports.
  - The stack is a three-layer system: web app, agent workflow, and sandbox VM. That makes it relevant to Superhuman's workspace-server and runtime-boundary questions even if it is not a desktop shell in the usual sense.
  - Current capabilities include durable multi-step execution, streaming, cancellation, sandbox hibernation or resume, repo cloning and branch work, optional auto-commit or PR creation, session sharing, and optional voice input.
  - This looks especially useful as a reference for control-plane versus execution-environment separation, durable runs, and hosted background-agent posture rather than for desktop UX directly.
- Possible routing angle:
  - agent control plane versus sandbox or runtime separation
  - durable workflow runs and resumable execution
  - hosted or cloud-agent posture compared with Superhuman's local-or-remote workspace-server model
  - what parts of a coding-agent system belong in the shell versus the runtime backend

The former `IBX-20260409-001` through `IBX-20260409-004` items were routed on `2026-04-09` into:

- `PLANS.md` as the concrete roadmap
- `STATUS.md` as the current next-step ladder
- `upstream-intake/` for the active memory-trust escalation
- `records/agent-worklogs/LOG-20260409-004-inbox-roadmap-formalization.md` as the routing trace

## Purge Rule

Once an item has been reflected into `SPEC.md`, `STATUS.md`, `PLANS.md`, `research/`, `records/decisions/`, `records/agent-worklogs/`, or `upstream-intake/`, remove the inbox entry and keep only the durable provenance trail in the destination artifact.
