import type {
  AutomationCapabilityPosture,
  AutomationEvidencePosture,
  AutomationEvidenceSource,
  AutomationVerificationPosture,
  StateAutomationEventAppend,
  SuperShellCapabilityMode,
  VerificationOutcome,
} from "../runtime/seams.js";

export type SuperAutomationPolicyAudit = Pick<
  StateAutomationEventAppend,
  | "policySummary"
  | "evidencePosture"
  | "evidenceSources"
  | "verificationPosture"
  | "verificationOutcome"
  | "capabilityPosture"
  | "capabilityMode"
>;

export function createTrustedStateAutomationPolicy(params: {
  policySummary: string;
  evidenceSources?: AutomationEvidenceSource[];
  verificationPosture?: AutomationVerificationPosture;
  verificationOutcome?: VerificationOutcome;
  capabilityPosture?: AutomationCapabilityPosture;
  capabilityMode?: SuperShellCapabilityMode;
}): SuperAutomationPolicyAudit {
  return {
    policySummary: params.policySummary,
    evidencePosture: "trusted_state",
    evidenceSources: params.evidenceSources ?? ["runtime_state"],
    verificationPosture: params.verificationPosture ?? "not_required",
    verificationOutcome: params.verificationOutcome,
    capabilityPosture: params.capabilityPosture ?? "not_required",
    capabilityMode: params.capabilityMode,
  };
}

export function createStructuredExternalAutomationPolicy(params: {
  policySummary: string;
  verificationPosture?: AutomationVerificationPosture;
  capabilityPosture?: AutomationCapabilityPosture;
}): SuperAutomationPolicyAudit {
  return {
    policySummary: params.policySummary,
    evidencePosture: "structured_external",
    evidenceSources: ["structured_external"],
    verificationPosture: params.verificationPosture ?? "not_required",
    capabilityPosture: params.capabilityPosture ?? "not_required",
  };
}

export function createDerivedAutomationPolicy(params: {
  policySummary: string;
  evidencePosture: AutomationEvidencePosture;
  evidenceSources: AutomationEvidenceSource[];
  verificationPosture: AutomationVerificationPosture;
  verificationOutcome?: VerificationOutcome;
  capabilityPosture: AutomationCapabilityPosture;
  capabilityMode?: SuperShellCapabilityMode;
}): SuperAutomationPolicyAudit {
  return {
    policySummary: params.policySummary,
    evidencePosture: params.evidencePosture,
    evidenceSources: [...params.evidenceSources],
    verificationPosture: params.verificationPosture,
    verificationOutcome: params.verificationOutcome,
    capabilityPosture: params.capabilityPosture,
    capabilityMode: params.capabilityMode,
  };
}
