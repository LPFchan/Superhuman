# Known Local Overrides

Use this register to record intentional Superhuman divergences so they do not have to be rediscovered from scratch every week.

Only record stable, intentional divergences here.
Do not use this file for temporary experiments or unreviewed preferences.

## Entry Template

- Area:
- Local surface:
- Upstream surface:
- Why Superhuman diverged:
- Collision rule to apply during intake:
- Revisit trigger:
- Related decision record:

## Current Entries

- Area: Generic local CLI backend support
- Local surface: `agents.defaults.cliBackends`, plugin-owned CLI backend registration, CLI backend docs and tests
- Upstream surface: upstream retreat from bundled CLI text-provider ownership and Anthropic Claude CLI onboarding
- Why Superhuman diverged: Superhuman explicitly wants local CLI or desktop-tool reuse as part of the product promise, while upstream is narrowing this surface for product and vendor-policy reasons
- Collision rule to apply during intake: keep generic local CLI backend support as a Superhuman-owned product surface; absorb upstream caution around vendor-specific paths, especially Anthropic policy-sensitive usage
- Revisit trigger: if vendor terms change further or Superhuman later decides to narrow the local-runtime promise
- Related decision record: `upstream-intake/reports/internal-records/UPS-20260407-001-v2026.4.5.md`

- Area: Reply-dispatch public seam preservation
- Local surface: `src/plugin-sdk/reply-dispatch-runtime.ts` and channel-plugin usage of shared dispatcher functions
- Upstream surface: generic `reply_dispatch` hook and plugin-owned interception model
- Why Superhuman diverged: the architectural direction is aligned, but Superhuman already exposes a public dispatcher seam that should not churn unnecessarily
- Collision rule to apply during intake: preserve the current public reply-dispatch seam while adapting upstream genericization ideas into the shared-core implementation
- Revisit trigger: only if upstream evolution requires a new public contract with clear compatibility benefit
- Related decision record: `upstream-intake/reports/internal-records/UPS-20260407-001-v2026.4.5.md`
