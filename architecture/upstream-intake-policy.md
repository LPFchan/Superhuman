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
Prefer storing the real working artifact in `architecture/upstream-intake/weekly-upstream-intake-template.md` and the weekly summary in `architecture/upstream-intake/operator-weekly-brief-template.md`.

## Default Decision Rules

- Accept low-risk security fixes, correctness fixes, and maintenance changes unless they conflict with an existing Superhuman-owned solution.
- Adapt changes that are directionally useful but need Superhuman-specific boundary, naming, or product adjustments.
- Decline changes that duplicate an established Superhuman-owned capability, break retained compatibility contracts, or push product direction against operator intent.

## Collision Resolution Policy

When upstream work overlaps an existing Superhuman implementation, resolve the collision with the following rules:

- If the fix belongs to shared core, prefer the upstream-shaped implementation.
- If the local fix is tied into Superhuman-only surfaces, keep the local implementation and adapt upstream ideas into that shape.
- If the upstream patch changes policy rather than just implementation, decide the policy first through operator escalation, then choose the implementation that matches that policy.
- Do not silently local-override a security-relevant upstream change when the real disagreement is about policy. Escalate the policy question explicitly.

This policy exists to avoid two failure modes:

- keeping a local forked implementation in shared core when upstream already provides the right generic fix
- blindly merging an upstream implementation when the actual conflict is a Superhuman product or compatibility policy decision

## Compatibility Review Rule

Any upstream change that touches plugin-facing contracts, shared-core to downstream boundaries, or migration-sensitive runtime identity surfaces requires explicit compatibility review before merge.

## Release Rule

Compatibility namespaces are reviewed again at release time even if they already passed weekly intake review.
