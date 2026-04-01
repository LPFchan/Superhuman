# Superhuman Port Plan

This directory turns the architecture spec into implementation-ready work packets.

How to use it:

1. Read [../superhuman-architecture-technical.md](../superhuman-architecture-technical.md) for the target system shape.
2. Execute phases in order unless a document explicitly says work can be parallelized.
3. Treat the existing OpenClaw shell as the compatibility baseline until Phase 1 is complete.
4. Preserve stable contracts introduced in earlier phases; later phases should extend them, not replace them.

Phase order:

1. [01-establish-the-shell.md](01-establish-the-shell.md)
2. [02-harden-the-runtime-core.md](02-harden-the-runtime-core.md)
3. [03-context-and-memory.md](03-context-and-memory.md)
4. [04-orchestration-and-messaging.md](04-orchestration-and-messaging.md)
5. [05-proactive-and-scheduled-automation.md](05-proactive-and-scheduled-automation.md)
6. [06-high-autonomy-execution-surfaces.md](06-high-autonomy-execution-surfaces.md)

Execution rules:

- Keep the shell operable at the end of every phase; no phase may require a later phase to make the product usable again.
- Prefer additive seams and adapters over whole-system rewrites.
- Persist enough state to debug failures as features land.
- Do not merge proactive or remote behavior ahead of the runtime and memory contracts they depend on.
- When a phase introduces a new service, define its storage model, control API, and observability surface together.

Shared deliverable standard:

- The phase has a clear set of repo-local touch points.
- The phase has explicit source extraction references from Claude Code, OpenClaw, or Hermes.
- The phase exposes testable exit criteria.
- The phase defines what is still out of scope so later phases do not leak backward.