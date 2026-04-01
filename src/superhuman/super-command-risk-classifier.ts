import {
  describeInterpreterInlineEval,
  detectInterpreterInlineEvalArgv,
} from "../infra/exec-inline-eval.js";
import { detectCommandObfuscation } from "../infra/exec-obfuscation-detect.js";
import { isSafeExecutableValue } from "../infra/exec-safety.js";
import { inspectHostExecEnvOverrides } from "../infra/host-env-security.js";

const DESTRUCTIVE_COMMAND_PATTERNS = [
  /(^|\s)rm\s+-[^\r\n]*\brf\b/i,
  /(^|\s)git\s+reset\s+--hard\b/i,
  /(^|\s)git\s+clean\s+-[^\r\n]*\bf\b/i,
  /(^|\s)git\s+checkout\s+--\b/i,
  /(^|\s)truncate\s+-s\s+0\b/i,
  />{1,2}\s*[^\s]+/,
] as const;

const SECRET_PATH_PATTERNS = [
  /(^|\s)~\/\.ssh\b/,
  /(^|\s)~\/\.aws\b/,
  /(^|\s)~\/\.openclaw\/credentials\b/,
  /(^|\s)~\/\.git-credentials\b/,
  /(^|\s)~\/\.npmrc\b/,
  /(^|\s)\.env(\.|\s|$)/,
] as const;

export type CommandRiskClassification = {
  risk: "low" | "medium" | "high";
  destructivePossible: boolean;
  reasons: string[];
  commandText?: string;
};

type ExecLikeArgs = {
  command?: unknown;
  cmd?: unknown;
  script?: unknown;
  argv?: unknown;
  env?: unknown;
};

function resolveCommandText(args: ExecLikeArgs): string | undefined {
  if (typeof args.command === "string" && args.command.trim()) {
    return args.command.trim();
  }
  if (typeof args.cmd === "string" && args.cmd.trim()) {
    return args.cmd.trim();
  }
  if (typeof args.script === "string" && args.script.trim()) {
    return args.script.trim();
  }
  if (Array.isArray(args.argv) && args.argv.length > 0) {
    return (
      args.argv
        .filter((token) => typeof token === "string")
        .join(" ")
        .trim() || undefined
    );
  }
  return undefined;
}

function resolveArgv(args: ExecLikeArgs): string[] | undefined {
  if (!Array.isArray(args.argv)) {
    return undefined;
  }
  const argv = args.argv.filter((token): token is string => typeof token === "string");
  return argv.length > 0 ? argv : undefined;
}

function classifyExecLikeArgs(args: ExecLikeArgs): CommandRiskClassification {
  const reasons: string[] = [];
  const commandText = resolveCommandText(args);
  const argv = resolveArgv(args);
  const executable = argv?.[0];

  if (executable && !isSafeExecutableValue(executable)) {
    reasons.push("unsafe executable token");
  }

  if (commandText) {
    const obfuscation = detectCommandObfuscation(commandText);
    if (obfuscation.detected) {
      reasons.push(...obfuscation.reasons);
    }
    for (const pattern of DESTRUCTIVE_COMMAND_PATTERNS) {
      if (pattern.test(commandText)) {
        reasons.push("destructive shell pattern");
        break;
      }
    }
    for (const pattern of SECRET_PATH_PATTERNS) {
      if (pattern.test(commandText)) {
        reasons.push("host secret path access");
        break;
      }
    }
  }

  const inlineEval = detectInterpreterInlineEvalArgv(argv);
  if (inlineEval) {
    reasons.push(`${describeInterpreterInlineEval(inlineEval)} detected`);
  }

  if (args.env && typeof args.env === "object" && !Array.isArray(args.env)) {
    const diagnostics = inspectHostExecEnvOverrides({
      overrides: args.env as Record<string, string>,
    });
    if (diagnostics.rejectedOverrideBlockedKeys.length > 0) {
      reasons.push("dangerous env override blocked");
    }
  }

  const destructivePossible = reasons.some(
    (reason) => reason === "destructive shell pattern" || reason === "host secret path access",
  );
  const sensitiveExecutionPattern = reasons.some(
    (reason) => reason.includes("inline") || reason.includes("env override"),
  );
  const risk =
    reasons.length === 0
      ? "low"
      : destructivePossible || sensitiveExecutionPattern || reasons.length > 1
        ? "high"
        : "medium";
  return {
    risk,
    destructivePossible,
    reasons,
    commandText,
  };
}

export function classifySuperCommandRisk(params: {
  toolName: string;
  args: unknown;
}): CommandRiskClassification {
  const toolName = params.toolName.trim().toLowerCase();
  if (
    (toolName !== "exec" && toolName !== "bash") ||
    !params.args ||
    typeof params.args !== "object"
  ) {
    return { risk: "low", destructivePossible: false, reasons: [] };
  }
  return classifyExecLikeArgs(params.args as ExecLikeArgs);
}
