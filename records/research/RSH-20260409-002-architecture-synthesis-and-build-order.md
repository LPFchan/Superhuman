# Architecture Synthesis And Build Order

- Research id: `RSH-20260409-002`
- Opened: `2026-04-09 05-19-05 KST`
- Recorded by agent: `019d6de0-986d-75e2-8d79-d9ee201759ce`

## Question

How should Superhuman’s long-horizon system shape and build order be understood after the migration wave, without re-splitting active planning across many competing phase docs?

## Key Findings

- The repo already has a coherent multi-source architecture story: OpenClaw provides the shell and ecosystem continuity, Claude-style systems contribute context and memory ideas, and Hermes contributes state and hardening patterns.
- The canonical build order remains the six-step sequence captured in the active architecture drafts and the detailed execution packet.
- The original `01` through `06` phase packets are still valuable as historical planning evidence, but they should no longer be treated as the live execution source of truth.
- Work-first product recomposition should happen after migration cleanup and root repo-surface adoption, not before.

## Routing Outcome

- The high-level architecture thesis informed `SPEC.md`.
- Accepted sequence and deferred directions informed `PLANS.md`.
- The archive phase packets remain source evidence under `architecture/archive/`, but this memo is the durable root-side synthesis for them.

## Source Material

- `architecture/superhuman-architecture-technical.md`
- `architecture/superhuman-architecture-simple.md`
- `architecture/detailed-execution-packet.md`
- `architecture/archive/01-establish-the-shell.md`
- `architecture/archive/02-harden-the-runtime-core.md`
- `architecture/archive/03-context-and-memory.md`
- `architecture/archive/04-orchestration-and-messaging.md`
- `architecture/archive/05-proactive-and-scheduled-automation.md`
- `architecture/archive/06-high-autonomy-execution-surfaces.md`

## Historical Accounting

This memo accounts for the architecture-synthesis and original phase-packet family. The old per-phase packets stay readable as historical inputs, but the reusable cross-phase synthesis now lives here plus `PLANS.md`.
