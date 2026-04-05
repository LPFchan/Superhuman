# Phase 5 Import Graph Report

## Scope

This report compares the downstream import shape at baseline commit `ddd2bb87c8` against the current Phase 5 working tree.

The purpose is to show whether the cleanup made the downstream layer easier to reason about, not to pretend every raw import count must monotonically decrease.

## Downstream Subtree Before and After

| Metric                                      | Baseline `ddd2bb87c8` |     Current tree | Result   |
| ------------------------------------------- | --------------------: | ---------------: | -------- |
| TypeScript files under `src/superhuman/`    |                    55 |               55 | stable   |
| `super-*` filenames under `src/superhuman/` |                    46 |                0 | improved |
| Domain folders in active use                |               partial | 8 stable folders | improved |

Current domain layout:

- `automation`
- `context`
- `orchestration`
- `policy`
- `remote`
- `runtime`
- `state`
- `transcript`

## Shared-Core to Downstream Imports

### Production files

| Metric                                                     | Baseline `ddd2bb87c8` | Current tree |
| ---------------------------------------------------------- | --------------------: | -----------: |
| Shared-core production files importing `src/superhuman/**` |                    19 |           21 |

Interpretation:

- The raw production-file count increased by 2, not because the downstream layer spread arbitrarily during Phase 5, but because the Phase 4 runtime identity migration left two compatibility seams in generic config/runtime surfaces: `src/config/paths.ts` and `src/infra/dotenv.ts`.
- The rest of the bridge list remained stable and is now easier to audit because downstream filenames are domain-based instead of product-prefix-based.

### Test files

| Metric                                               | Baseline `ddd2bb87c8` | Current tree |
| ---------------------------------------------------- | --------------------: | -----------: |
| Shared-core test files importing `src/superhuman/**` |                     4 |           10 |

Interpretation:

- The test-only increase is expected in this phase.
- More of the downstream surface now has direct coverage from moved compatibility and integration tests, especially around runtime, config migration, and bridge behavior.
- This is acceptable because the added imports are confined to tests rather than general production code.

## What Actually Improved

1. The downstream subtree now communicates ownership by directory instead of by repetitive filename prefixes.
2. Shared-core bridge sites can be reviewed as a finite list of files instead of as scattered `super-*` path variants.
3. Import churn inside the downstream subtree now follows domain boundaries (`runtime`, `automation`, `state`, and so on) rather than ad hoc product prefixes.
4. Future refactors can reduce bridge-file count incrementally without first paying a naming cleanup tax.

## Validation Run Used For This Report

Focused runtime validation passed after the final test relocations:

- `src/superhuman/runtime/agent.test.ts`
- `src/superhuman/runtime/gateway.test.ts`
- `src/superhuman/runtime/seam-integration.test.ts`
- `src/superhuman/runtime/session-persistence-adapter.test.ts`
- `src/superhuman/state/store.test.ts`

Result: 5 files passed, 20 tests passed.

## Conclusion

The Phase 5 cleanup improved the import graph structurally even though one compatibility-driven subset of shared-core references remains.
The downstream layer is now organized by domain, the filename noise is gone, and the remaining boundary crossings are identifiable enough to treat as an explicit review surface.
