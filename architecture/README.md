# Superhuman Architecture Docs

This directory is the canonical internal home for architecture, migration, UX, and audit material.
It turns the architecture spec into implementation-ready work packets.

Additional planning docs:

1. [Product Migration Plan](product-migration-plan.md) for the full repo identity, provenance, code-structure, runtime, and docs migration.
2. [Weekly Upstream Intake Template](weekly-upstream-intake-template.md) for logging accept, adapt, or decline decisions during OpenClaw sync review.
3. [Migration Charter](migration-charter.md) for Phase 1 ratification status, approval roles, freeze rules, and unresolved canonical values.
4. [Current Surface Inventory](current-surface-inventory.md) for public identity, compatibility, shared-core, and downstream classification.
5. [Plugin Contract Map](plugin-contract-map.md) for keep, alias, or migrate decisions on plugin-facing contracts.
6. [Plugin Compatibility Matrix](plugin-compatibility-matrix.md) for the representative compatibility set that later phases must preserve.
7. [Naming Glossary](naming-glossary.md) for current migration naming rules and drift freezes.
8. [Phase 5 Boundary Documentation](phase-5-boundary-documentation.md) for the approved shared-core versus downstream dependency direction.
9. [Phase 5 Import Graph Report](phase-5-import-graph-report.md) for the downstream normalization evidence and bridge-file counts.
10. [Phase 5 Plugin Contract Diff Report](phase-5-plugin-contract-diff-report.md) for the compatibility-sensitive surfaces preserved during the Phase 5 cleanup.
11. [Docs Taxonomy Audit](docs-taxonomy-audit.md) for the current public-docs classification after the Phase 6 cleanup.
12. [Release Candidate Readiness](release-candidate-readiness.md) for the final migration-wave release posture.
13. [Upgrade Validation Report](upgrade-validation-report.md) for the OpenClaw-to-Superhuman runtime migration evidence.
14. [Plugin Compatibility Report](plugin-compatibility-report.md) for the retained plugin contract validation summary.
15. [Release Audit Checklist](release-audit-checklist.md) for pre-release identity, upgrade, compatibility, and verification review.
16. [Upstream Intake Policy](upstream-intake-policy.md) for the accept, adapt, or decline operating model.
17. [Autonomous Maintenance Boundary](autonomous-maintenance-boundary.md) for the explicit escalation and approval boundary.

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
