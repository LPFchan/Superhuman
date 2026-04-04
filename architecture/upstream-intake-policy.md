# Upstream Intake Policy

## Weekly Cadence

Superhuman reviews upstream OpenClaw changes on a weekly cadence.

Upstream changes are reviewed continuously, but they are not adopted automatically.

## Decision Outcomes

Every reviewed upstream change must be classified as one of:

- `accept`
- `adapt`
- `decline`

Record each decision in `architecture/weekly-upstream-intake-template.md`.

## Default Decision Rules

- Accept low-risk security fixes, correctness fixes, and maintenance changes unless they conflict with an existing Superhuman-owned solution.
- Adapt changes that are directionally useful but need Superhuman-specific boundary, naming, or product adjustments.
- Decline changes that duplicate an established Superhuman-owned capability, break retained compatibility contracts, or push product direction against operator intent.

## Compatibility Review Rule

Any upstream change that touches plugin-facing contracts, shared-core to downstream boundaries, or migration-sensitive runtime identity surfaces requires explicit compatibility review before merge.

## Release Rule

Compatibility namespaces are reviewed again at release time even if they already passed weekly intake review.
