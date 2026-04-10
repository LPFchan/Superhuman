# Superhuman Inbox

This file is an ephemeral scratch disk for unresolved intake and routing items.

Rules:

- Keep it easy to append to from messenger, operator notes, or agent capture.
- Remove entries once they are reflected into durable repo artifacts.
- Keep the stable `IBX-*` id even after the inbox entry is later deleted.
- Do not treat this file as durable truth.

## Active Intake

### `IBX-20260410-001` Native desktop inspiration capture

- Opened: `2026-04-10 11-36-44 KST`
- Recorded by agent: `019d753c-d68c-7152-af8b-d53a8a9ea139`
- Source: operator capture plus attached tweet JSON packets
- Status: unrouted
- Summary: capture a small cluster around native agent-engineering desktop products and lightweight agent cockpits. Operator note: Superconductor stands out because it is written in Rust and is not an Electron app.
- Links:
  - `https://super.engineering/`
  - `https://jazzyalex.github.io/agent-sessions/`
- Captured takeaways:
  - Superconductor positioning: native macOS app for agentic engineering, explicitly framed as `No Electron. No Tauri. 100% Rust.` and focused on managing multiple coding agents with low friction.
  - Market signal / critique: one reply argues the name and positioning invite comparison to a similar product and that `native and fast` is becoming weaker differentiation because the comparison target has also recently gone native.
  - Agent Sessions positioning: minimal macOS open-source `Agent Cockpit` for improving workflows across multiple CLI agents rather than replacing them with a full ADE.
  - Possible routing angle: substrate choice, multi-agent orchestration UX, and the difference between a full ADE and a lighter operator cockpit all seem relevant to Superhuman's desktop research lane.
- Source packets:
  - `https://x.com/superdoteng/status/2042335263154978868`
  - `https://x.com/kylecordes/status/2042414490457710693`
  - `https://x.com/jazzyalex/status/2042416651958960537`

The former `IBX-20260409-001` through `IBX-20260409-004` items were routed on `2026-04-09` into:

- `PLANS.md` as the concrete roadmap
- `STATUS.md` as the current next-step ladder
- `upstream-intake/` for the active memory-trust escalation
- `records/agent-worklogs/LOG-20260409-004-inbox-roadmap-formalization.md` as the routing trace

## Purge Rule

Once an item has been reflected into `SPEC.md`, `STATUS.md`, `PLANS.md`, `research/`, `records/decisions/`, `records/agent-worklogs/`, or `upstream-intake/`, remove the inbox entry and keep only the durable provenance trail in the destination artifact.
