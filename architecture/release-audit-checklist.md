# Release Audit Checklist

## Pre-release identity audit

- Confirm README, docs homepage, package metadata, UI shell, and app display names are Superhuman-first.
- Confirm any remaining OpenClaw-shaped names are documented as provenance or compatibility surfaces.
- Confirm `architecture/` remains internal-only and `docs/` remains the only public docs root.

## Upgrade audit

- Confirm legacy config and state paths are still readable.
- Confirm Superhuman paths and env vars win over legacy names when both are present.
- Confirm CLI alias behavior and deprecation messaging are still intentional.
- Confirm Control UI storage migration behavior remains documented.

## Plugin compatibility audit

- Confirm `openclaw/plugin-sdk/*` still resolves.
- Confirm `openclaw.plugin.json` discovery still works.
- Confirm `@openclaw/*` install identifiers remain recognized where required.
- Confirm representative plugin discovery and load tests stay green.

## Boundary audit

- Confirm new shared-core imports of `src/superhuman/**` are justified bridge files.
- Confirm no new `super-*` filenames appear inside `src/superhuman/`.
- Confirm plugin-facing contracts were not renamed casually.

## Verification gate

- Run `pnpm check`.
- Run `pnpm build`.
- Run `pnpm test` or explicitly document the scoped test coverage used for the release decision.
