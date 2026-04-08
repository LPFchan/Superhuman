# Superhuman Architecture Docs

This directory is the internal evidence, migration, UX, and historical snapshot tree for Superhuman.

The canonical repo-managed operating surfaces now live at the repository root, not in `architecture/`.

## Root Canonical Surfaces

1. [`../REPO.md`](../REPO.md) for the canonical repo contract.
2. [`../SPEC.md`](../SPEC.md) for durable product truth.
3. [`../STATUS.md`](../STATUS.md) for current operational reality.
4. [`../PLANS.md`](../PLANS.md) for accepted future direction.
5. [`../INBOX.md`](../INBOX.md) for unresolved intake.
6. [`../research/README.md`](../research/README.md) for curated root research memos.
7. [`../records/decisions/README.md`](../records/decisions/README.md) for durable decision records.
8. [`../records/agent-worklogs/README.md`](../records/agent-worklogs/README.md) for execution history.
9. [`../upstream-intake/README.md`](../upstream-intake/README.md) for the canonical upstream review package.

## Active Internal Evidence Docs

1. [Product Migration Plan](product-migration-plan.md) for the full repo identity, provenance, code-structure, runtime, and docs migration.
2. [Migration Charter](migration-charter.md) for the ratified Phase 1 contract, approval roles, and standing freeze rules.
3. [Current Surface Inventory](current-surface-inventory.md) for public identity, compatibility, shared-core, and downstream classification.
4. [Plugin Contract Map](plugin-contract-map.md) for keep, alias, or migrate decisions on plugin-facing contracts.
5. [Plugin Compatibility Matrix](plugin-compatibility-matrix.md) for the representative compatibility set that later phases must preserve.
6. [Naming Glossary](naming-glossary.md) for migration naming rules and drift freezes.
7. [Docs Taxonomy Audit](docs-taxonomy-audit.md) for the current public-docs classification after the Phase 6 cleanup.
8. [Release Candidate Readiness](release-candidate-readiness.md) for the current release posture of this migration wave.
9. [Upgrade Validation Report](upgrade-validation-report.md) for the OpenClaw-to-Superhuman runtime migration evidence.
10. [Release Audit Checklist](release-audit-checklist.md) for pre-release identity, upgrade, compatibility, and verification review.
11. [Upstream Intake Policy](upstream-intake-policy.md) for the accept, adapt, or decline operating model.
12. [Weekly Upstream Intake Template](weekly-upstream-intake-template.md) as the compatibility entry point that redirects to the root canonical intake package.
13. [Autonomous Maintenance Boundary](autonomous-maintenance-boundary.md) for the explicit escalation and approval boundary.
14. [detailed-execution-packet.md](detailed-execution-packet.md) for the consolidated detailed implementation packet that replaces the old per-phase execution docs.
15. [superhuman-architecture-technical.md](superhuman-architecture-technical.md) for the detailed target-system architecture.
16. [superhuman-architecture-simple.md](superhuman-architecture-simple.md) for the simpler architectural summary.
17. [repo-operating-model.md](repo-operating-model.md) as the retired entry point that now points to the root canonical repo contract.
18. [repo-templates/README.md](repo-templates/README.md) as the retired entry point that explains the canonical managed surfaces now live at the root.
19. [upstream-intake/README.md](upstream-intake/README.md) as the retired pointer to the root `upstream-intake/` package.

## Historical Evidence And Implementation Snapshots

These documents are still useful, but they capture audits, checkpoints, or superseded planning state rather than the current canonical operating layer.

1. [archive/README.md](archive/README.md) is the entry point for archived reports, audits, and superseded drafts.
2. [archive/phase-5-boundary-documentation.md](archive/phase-5-boundary-documentation.md), [archive/phase-5-import-graph-report.md](archive/phase-5-import-graph-report.md), [archive/phase-5-plugin-contract-diff-report.md](archive/phase-5-plugin-contract-diff-report.md), and [archive/plugin-compatibility-report.md](archive/plugin-compatibility-report.md) preserve Phase 5 boundary and compatibility evidence.
3. [archive/claude-code-tweet-audit.md](archive/claude-code-tweet-audit.md) and [archive/agent-feedback-phase-1.md](archive/agent-feedback-phase-1.md) through [archive/agent-feedback-phase-4.md](archive/agent-feedback-phase-4.md) preserve earlier audit and feedback inputs.
4. [archive/01-establish-the-shell.md](archive/01-establish-the-shell.md) through [archive/06-high-autonomy-execution-surfaces.md](archive/06-high-autonomy-execution-surfaces.md) preserve the original per-phase execution packets.
5. [archive/README.superhuman-draft.md](archive/README.superhuman-draft.md) is an obsolete front-door draft retained for history only.

## How To Use This Directory

1. Start with the root canonical docs when you need current truth, status, plans, intake, research, decisions, or worklogs.
2. Use the active architecture docs here as internal evidence and deeper migration context.
3. Treat `archive/` as historical input, not as a second current source of truth.
4. Preserve stable compatibility and boundary contracts introduced during the migration; later work should extend them rather than casually replacing them.
