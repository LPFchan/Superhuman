# Superhuman Architecture Docs

This directory is the canonical internal home for architecture, migration, UX, and audit material.
It holds both the active source-of-truth docs and the historical evidence that led to the current migration posture.

## Active source-of-truth docs

1. [Product Migration Plan](product-migration-plan.md) for the full repo identity, provenance, code-structure, runtime, and docs migration.
2. [Migration Charter](migration-charter.md) for the ratified Phase 1 contract, approval roles, and standing freeze rules.
3. [Current Surface Inventory](current-surface-inventory.md) for public identity, compatibility, shared-core, and downstream classification.
4. [Plugin Contract Map](plugin-contract-map.md) for keep, alias, or migrate decisions on plugin-facing contracts.
5. [Plugin Compatibility Matrix](plugin-compatibility-matrix.md) for the representative compatibility set that later phases must preserve.
6. [Naming Glossary](naming-glossary.md) for current migration naming rules and drift freezes.
7. [Docs Taxonomy Audit](docs-taxonomy-audit.md) for the current public-docs classification after the Phase 6 cleanup.
8. [Release Candidate Readiness](release-candidate-readiness.md) for the current release posture of this migration wave.
9. [Upgrade Validation Report](upgrade-validation-report.md) for the OpenClaw-to-Superhuman runtime migration evidence.
10. [Release Audit Checklist](release-audit-checklist.md) for pre-release identity, upgrade, compatibility, and verification review.
11. [Upstream Intake Policy](upstream-intake-policy.md) for the accept, adapt, or decline operating model.
12. [upstream-intake/README.md](upstream-intake/README.md) for the canonical weekly upstream intake package, templates, registers, and report artifacts.
13. [Weekly Upstream Intake Template](weekly-upstream-intake-template.md) as the compatibility entry point that redirects to the canonical intake package.
14. [Autonomous Maintenance Boundary](autonomous-maintenance-boundary.md) for the explicit escalation and approval boundary.
15. [detailed-execution-packet.md](detailed-execution-packet.md) for the consolidated detailed implementation packet that replaces the old per-phase execution docs.
16. [superhuman-architecture-technical.md](superhuman-architecture-technical.md) for the detailed target-system architecture.
17. [superhuman-architecture-simple.md](superhuman-architecture-simple.md) for the simpler architectural summary.

## Historical evidence and implementation snapshots

These documents are still useful, but they capture audits, checkpoints, or phase-specific evidence rather than the current top-level plan.

1. [archive/README.md](archive/README.md) is the entry point for archived reports, audits, and superseded drafts.
2. [archive/phase-5-boundary-documentation.md](archive/phase-5-boundary-documentation.md) records the approved shared-core versus downstream dependency direction at the Phase 5 checkpoint.
3. [archive/phase-5-import-graph-report.md](archive/phase-5-import-graph-report.md) captures the downstream normalization evidence and bridge-file counts at that checkpoint.
4. [archive/phase-5-plugin-contract-diff-report.md](archive/phase-5-plugin-contract-diff-report.md) records the compatibility-sensitive surfaces preserved during the Phase 5 cleanup.
5. [archive/plugin-compatibility-report.md](archive/plugin-compatibility-report.md) summarizes retained plugin contract validation.
6. [archive/claude-code-tweet-audit.md](archive/claude-code-tweet-audit.md) preserves the dated Claude Code source audit that fed into the phase docs.
7. [archive/agent-feedback-phase-1.md](archive/agent-feedback-phase-1.md), [archive/agent-feedback-phase-2.md](archive/agent-feedback-phase-2.md), [archive/agent-feedback-phase-3.md](archive/agent-feedback-phase-3.md), and [archive/agent-feedback-phase-4.md](archive/agent-feedback-phase-4.md) preserve historical implementation feedback tied to earlier phase deliveries.
8. [archive/01-establish-the-shell.md](archive/01-establish-the-shell.md), [archive/02-harden-the-runtime-core.md](archive/02-harden-the-runtime-core.md), [archive/03-context-and-memory.md](archive/03-context-and-memory.md), [archive/04-orchestration-and-messaging.md](archive/04-orchestration-and-messaging.md), [archive/05-proactive-and-scheduled-automation.md](archive/05-proactive-and-scheduled-automation.md), and [archive/06-high-autonomy-execution-surfaces.md](archive/06-high-autonomy-execution-surfaces.md) preserve the original per-phase execution packets that were later folded into one active document.

## Superseded drafts kept only for history

1. [archive/README.superhuman-draft.md](archive/README.superhuman-draft.md) is an obsolete front-door draft and should not be used as current product positioning.
2. [archive/Superhuman UX Research.md](archive/Superhuman%20UX%20Research.md) is the original UX exploration prompt and rough notes.
3. [archive/Superhuman UX Research (revised).md](<archive/Superhuman%20UX%20Research%20(revised).md>) is the retained UX audit snapshot from that exploration thread.

How to use it:

1. Read [superhuman-architecture-technical.md](superhuman-architecture-technical.md) for the target system shape.
2. Use [product-migration-plan.md](product-migration-plan.md) as the current migration sequence and status source of truth.
3. Use [detailed-execution-packet.md](detailed-execution-packet.md) for the active implementation detail formerly split across six phase docs.
4. Treat historical reports as evidence snapshots, not live status docs.
5. Preserve stable contracts introduced in earlier phases; later phases should extend them, not replace them.

Phase order:

1. [Phase 1](detailed-execution-packet.md#phase-1-establish-the-shell)
2. [Phase 2](detailed-execution-packet.md#phase-2-harden-the-runtime-core)
3. [Phase 3](detailed-execution-packet.md#phase-3-context-and-memory)
4. [Phase 4](detailed-execution-packet.md#phase-4-orchestration-and-messaging)
5. [Phase 5](detailed-execution-packet.md#phase-5-proactive-and-scheduled-automation)
6. [Phase 6](detailed-execution-packet.md#phase-6-high-autonomy-execution-surfaces)

Execution rules:

- Keep the shell operable at the end of every phase; no phase may require a later phase to make the product usable again.
- Prefer additive seams and adapters over whole-system rewrites.
- Persist enough state to debug failures as features land.
- Do not merge proactive or remote behavior ahead of the runtime and memory contracts they depend on.
- When a phase introduces a new service, define its storage model, control API, and observability surface together.
- Do not reuse a historical snapshot as if it were live status; update the active source-of-truth docs instead.

Shared deliverable standard:

- The phase has a clear set of repo-local touch points.
- The phase has explicit source extraction references from Claude Code, OpenClaw, or Hermes.
- The phase exposes testable exit criteria.
- The phase defines what is still out of scope so later phases do not leak backward.
