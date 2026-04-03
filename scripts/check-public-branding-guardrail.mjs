#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const DEFAULT_PATHS = [
  "README.md",
  "CONTRIBUTING.md",
  "docs/index.md",
  "docs/docs.json",
  "ui/index.html",
  ".github/ISSUE_TEMPLATE/config.yml",
];

const ALLOW_PATTERNS = [/provenance/i, /compatib/i, /fork/i, /upstream/i, /lineage/i];

function getDiff(paths) {
  try {
    return execFileSync("git", ["diff", "--no-ext-diff", "--unified=0", "--", ...paths], {
      encoding: "utf8",
    });
  } catch (error) {
    const stdout = typeof error?.stdout === "string" ? error.stdout : "";
    const stderr = typeof error?.stderr === "string" ? error.stderr : "";
    const combined = [stdout, stderr].filter(Boolean).join("\n");
    if (combined.trim()) {
      process.stderr.write(`${combined.trim()}\n`);
    }
    process.exit(typeof error?.status === "number" ? error.status : 1);
  }
}

function isAllowed(line) {
  return ALLOW_PATTERNS.some((pattern) => pattern.test(line));
}

const paths = process.argv.slice(2);
const targetPaths = paths.length > 0 ? paths : DEFAULT_PATHS;
const diff = getDiff(targetPaths);
const findings = [];
let currentFile = null;

for (const line of diff.split("\n")) {
  if (line.startsWith("+++ b/")) {
    currentFile = line.slice(6);
    continue;
  }
  if (!currentFile || !line.startsWith("+") || line.startsWith("+++")) {
    continue;
  }

  if (!/OpenClaw|openclaw/.test(line)) {
    continue;
  }
  if (isAllowed(line)) {
    continue;
  }

  findings.push({ file: currentFile, line: line.slice(1) });
}

if (findings.length === 0) {
  process.stdout.write("No disallowed public OpenClaw branding additions found.\n");
  process.exit(0);
}

process.stderr.write("Disallowed public OpenClaw branding additions detected:\n");
for (const finding of findings) {
  process.stderr.write(`- ${finding.file}: ${finding.line.trim()}\n`);
}
process.stderr.write(
  "Allowed uses are limited to provenance, compatibility, fork lineage, or upstream references.\n",
);
process.exit(1);
