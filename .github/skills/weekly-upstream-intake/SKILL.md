---
name: weekly-upstream-intake
description: "Run the weekly OpenClaw upstream intake review. Use for release triage, commit-window review, accept/adapt/decline decisions, operator escalations, compatibility analysis, and weekly upstream reports."
argument-hint: "Upstream release, compare window, or refs to review"
---

# Weekly Upstream Intake

Use this skill when Superhuman needs a repeatable review of upstream OpenClaw changes.

## What This Skill Produces

- a structured `accept` / `adapt` / `decline` decision record for each important upstream change or grouped change set
- a separate plain-language operator brief that explains what matters and why
- explicit escalation packets for product or compatibility decisions that cannot be made autonomously

## When To Use

- weekly upstream sync review
- release note triage
- merge-window planning
- deciding whether upstream fixes should land as-is or be adapted
- preparing a report for the operator before merging upstream work

## Procedure

1. Define the upstream scope.
   - Capture the release tag, compare window, or commit range.
   - Record the current Superhuman branch or baseline.

2. Gather upstream evidence.
   - Start with release notes.
   - Read underlying commits, PRs, docs, or code when the release notes do not explain the practical impact.

3. Group changes into candidate decisions.
   - Combine near-duplicate commits into one decision when they solve the same problem.
   - Separate product-shaping work from routine bug fixes.

4. Analyze each candidate deeply.
   - What does it actually mean?
   - What exact vendor, provider, feature, contract, or path is changing?
   - What exact local Superhuman surface is affected?
   - What is the before state, after state, and concrete consequence?
   - What is not changing?
   - What changes for end users or operators?
   - Is it breaking or migration-sensitive?
   - How relevant is it to Superhuman right now?
   - Is it duplicating local work?
   - Which implementation should win if there is overlap?
   - What are the upside, downside, and maintenance tradeoffs?
   - Is there any security or hardening conflict with an existing Superhuman implementation?
   - What compatibility details matter if it lands?
   - Is this a policy change, an implementation change, or both?
   - What literal user or operator scenario explains the impact best?
   - If any of this depends on vendor policy, pricing, legal terms, or external product behavior, use internet lookup and prefer official sources.

5. Decide `accept`, `adapt`, or `decline`.
   - Use existing repo policy, not personal preference.
   - If the change is blocked on product direction, public contract risk, or security-vs-compatibility tradeoffs, escalate.

6. Fill the canonical template.
   - Use [architecture/upstream-intake/weekly-upstream-intake-template.md](../../../architecture/upstream-intake/weekly-upstream-intake-template.md).
   - Write the full record under [architecture/upstream-intake/reports/internal-records/README.md](../../../architecture/upstream-intake/reports/internal-records/README.md).
   - Keep rationale short but concrete.

7. Produce the operator brief.
   - Use [architecture/upstream-intake/operator-weekly-brief-template.md](../../../architecture/upstream-intake/operator-weekly-brief-template.md) for the lighter summary.
   - Store it as a separate artifact under [architecture/upstream-intake/reports/operator-briefs/README.md](../../../architecture/upstream-intake/reports/operator-briefs/README.md).
   - Put unresolved operator-facing calls before routine autonomous decisions.
   - The internal record should hold the exhaustive field-by-field reasoning.
   - The operator brief should translate that reasoning into natural language, not mirror every internal-record label.

## Required Operator Brief Shape

### Decisions Made Autonomously

For each item, include:

- what it actually means
- why it was safe to decide autonomously
- what action follows from the decision

### Decisions Requiring Operator Input

For each item, include:

- the concrete decision the operator is being asked to make
- the exact vendor, provider, feature, or path affected
- what it means in simple terms
- what is not changing
- effect on architecture or user experience
- realistic options
- recommended direction
- blocked follow-up work

Present that material as a short conversational mini-brief.
Do not turn the operator brief into a field dump copied from the internal record unless the user explicitly asks for that shape.

## Escalation Triggers

Escalate instead of guessing when the change:

- affects plugin-facing contracts or migration-sensitive compatibility surfaces
- changes onboarding, user workflow, or product positioning
- conflicts with an existing Superhuman-owned implementation and the winning policy is not already explicit
- requires declining or locally overriding a security-relevant upstream change
- removes a compatibility layer or changes a public contract

## Output Quality Bar

- Plain-language explanations, not release-note paraphrases
- Explicit tradeoffs
- Explicit compatibility details
- Clear autonomous-vs-operator split
- Recommendation grounded in current Superhuman policy and architecture
