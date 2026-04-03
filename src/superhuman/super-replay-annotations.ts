import type {
  StateReplayAnnotation,
  SuperVerificationStage,
  SuperVerifierKind,
  VerificationOutcome,
} from "./runtime/seams.js";

function normalizeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeVerificationOutcome(value: unknown): VerificationOutcome | undefined {
  return value === "verified" || value === "not_verifiable" || value === "verification_failed"
    ? value
    : undefined;
}

function normalizeVerifierKind(value: unknown): SuperVerifierKind | undefined {
  return typeof value === "string" && value.trim()
    ? (value.trim() as SuperVerifierKind)
    : undefined;
}

function pushUniqueAnnotation(
  target: StateReplayAnnotation[],
  annotation: StateReplayAnnotation | undefined,
): void {
  if (!annotation) {
    return;
  }
  const serialized = JSON.stringify(annotation);
  if (target.some((entry) => JSON.stringify(entry) === serialized)) {
    return;
  }
  target.push(annotation);
}

function normalizeExistingAnnotations(value: unknown): StateReplayAnnotation[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is StateReplayAnnotation =>
      Boolean(entry) &&
      typeof entry === "object" &&
      typeof (entry as { kind?: unknown }).kind === "string",
  );
}

export function extractSuperReplayAnnotations(
  meta: Record<string, unknown>,
): StateReplayAnnotation[] {
  const annotations = normalizeExistingAnnotations(meta.replayAnnotations);

  const verificationOutcome =
    normalizeVerificationOutcome(meta.verificationOutcome) ??
    normalizeVerificationOutcome(meta.verificationStatus);
  const verificationStage = normalizeString(meta.verificationStage);
  const verifierKind =
    normalizeVerifierKind(meta.verifierKind) ??
    normalizeVerifierKind(meta.verifier) ??
    normalizeVerifierKind(meta.verifier_type);
  const verificationSummary =
    normalizeString(meta.verificationSummary) ?? normalizeString(meta.verificationMessage);
  const verificationCommand =
    normalizeString(meta.verificationCommand) ?? normalizeString(meta.command);
  const verificationExitCode =
    normalizeNumber(meta.verificationExitCode) ?? normalizeNumber(meta.exitCode);
  pushUniqueAnnotation(
    annotations,
    verificationOutcome || verificationStage || verifierKind || verificationSummary
      ? {
          kind: "verification",
          outcome: verificationOutcome,
          stage: verificationStage as SuperVerificationStage | undefined,
          verifierKind,
          summary: verificationSummary,
          command: verificationCommand,
          exitCode: verificationExitCode,
        }
      : undefined,
  );

  const partialRead =
    normalizeBoolean(meta.partialRead) ||
    normalizeBoolean(meta.partial_read) ||
    normalizeBoolean(meta.truncated);
  pushUniqueAnnotation(
    annotations,
    partialRead
      ? {
          kind: "partial_read",
          sourceTool: normalizeString(meta.sourceTool),
          descriptor: normalizeString(meta.descriptor),
          requestedRange: {
            startLine: normalizeNumber(meta.requestedStartLine) ?? normalizeNumber(meta.startLine),
            endLine: normalizeNumber(meta.requestedEndLine) ?? normalizeNumber(meta.endLine),
          },
          returnedRange: {
            startLine: normalizeNumber(meta.returnedStartLine) ?? normalizeNumber(meta.startLine),
            endLine: normalizeNumber(meta.returnedEndLine) ?? normalizeNumber(meta.endLine),
          },
          totalKnownLines: normalizeNumber(meta.totalKnownLines),
          limitKind: normalizeString(meta.limitKind),
          continuationHint: normalizeString(meta.continuationHint),
          artifactId: normalizeString(meta.partialReadArtifactId),
          fullArtifactId: normalizeString(meta.fullArtifactId),
        }
      : undefined,
  );

  const persistedPreview =
    normalizeBoolean(meta.persistedPreview) ||
    normalizeBoolean(meta.persisted_preview) ||
    normalizeBoolean(meta.previewDerived);
  pushUniqueAnnotation(
    annotations,
    persistedPreview
      ? {
          kind: "persisted_preview",
          descriptor: normalizeString(meta.descriptor),
          previewArtifactId: normalizeString(meta.previewArtifactId),
          fullArtifactId: normalizeString(meta.fullArtifactId),
          storagePath:
            normalizeString(meta.storagePath) ??
            normalizeString(meta.storage_path) ??
            normalizeString(meta.fullStoragePath) ??
            normalizeString(meta.full_storage_path),
          previewBytes: normalizeNumber(meta.previewBytes) ?? normalizeNumber(meta.preview_bytes),
          fullBytes: normalizeNumber(meta.fullBytes) ?? normalizeNumber(meta.full_bytes),
        }
      : undefined,
  );

  const importedFrom = normalizeString(meta.importedFrom);
  pushUniqueAnnotation(
    annotations,
    importedFrom
      ? {
          kind: "imported_history",
          importedFrom,
          externalId: normalizeString(meta.externalId),
          sourceSessionKey: normalizeString(meta.sourceSessionKey),
          descriptor: normalizeString(meta.descriptor),
        }
      : undefined,
  );

  return annotations;
}
