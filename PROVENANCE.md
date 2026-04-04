# Provenance

Superhuman began as a fork of OpenClaw and has diverged into its own product and repository.

This repository preserves that lineage on purpose.
The migration away from OpenClaw as the public product identity is not an attempt to erase legal or historical origin.
It is a product identity change with an explicit compatibility commitment.

## What Stays Intact

- The MIT license remains in place.
- Copyright notice and license provenance remain intact.
- Historical OpenClaw origin remains documented.
- Compatibility-sensitive surfaces inherited from OpenClaw remain explicit where Superhuman still supports the OpenClaw plugin ecosystem.

## What Is Changing

- The public product identity is becoming Superhuman.
- Public repo, docs, UI, app, CLI, package, config, and state surfaces are migrating to Superhuman naming in ordered phases.
- Internal planning and downstream code are being organized around a deliberate Superhuman boundary rather than an accidental fork state.

## What Is Not Changing

- Superhuman does not claim the codebase was written from scratch without OpenClaw.
- Superhuman does not remove provenance to make branding changes look cleaner.
- Superhuman does not treat plugin compatibility as a temporary accident.

## Compatibility Posture

During this migration wave, some inherited OpenClaw-shaped identifiers remain in place because they are ecosystem contracts rather than product-branding leftovers.
This includes selected SDK imports, package scopes, manifest conventions, and plugin discovery/install surfaces.

Those surfaces are documented as compatibility namespaces, not as the public product identity.

## Related Documents

- Public provenance page: `docs/reference/provenance.md`
- Public migration guide: `docs/install/superhuman-migration.md`
- Internal migration contract: `architecture/product-migration-plan.md`
- Phase 1 governance artifacts: `architecture/migration-charter.md`
