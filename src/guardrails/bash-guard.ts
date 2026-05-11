/**
 * Bash command guardrails for oh-my-awesome-agent.
 *
 * Intercepts potentially destructive or irreversible shell commands
 * and signals risk levels before execution.
 */

export type RiskLevel = "allow" | "warn" | "confirm" | "block";

interface GuardResult {
	level: RiskLevel;
	reason?: string;
}

const DESTRUCTIVE_PATTERNS: Array<{
	pattern: RegExp;
	reason: string;
	level: RiskLevel;
}> = [
	// BLOCK patterns first (most dangerous)
	{
		pattern: /\brm\s+-rf\s*\/$/,
		reason: "Recursive delete from root",
		level: "block",
	},
	{
		pattern: /\brm\s+-rf\s*\$home/,
		reason: "Recursive delete home directory",
		level: "block",
	},
	{
		pattern: /\brm\s+-rf\s*\.\.\//,
		reason: "Recursive delete outside workspace",
		level: "block",
	},
	{
		pattern: /\benv\s*\|.*curl/,
		reason: "Potential secret exfiltration",
		level: "block",
	},

	// CONFIRM patterns
	{
		pattern: /\brm\b.*\s-rf?\b/,
		reason: "File deletion command",
		level: "confirm",
	},
	{ pattern: /\brm\b.*\*/, reason: "Wildcard deletion", level: "confirm" },
	{ pattern: /\brmdir\b/, reason: "Directory removal", level: "confirm" },
	{ pattern: /\bunlink\b/, reason: "File unlink", level: "confirm" },
	{
		pattern: /\bmv\b.*\b\/.+\b.*\b\/.+\b/,
		reason: "Move overwriting existing path",
		level: "confirm",
	},
	{
		pattern: /\bchmod\s+-R\b/,
		reason: "Recursive permission change",
		level: "confirm",
	},
	{
		pattern: /\bchown\s+-R\b/,
		reason: "Recursive ownership change",
		level: "confirm",
	},
	{
		pattern: /\bgit\s+reset\s+--hard\b/,
		reason: "Hard git reset",
		level: "confirm",
	},
	{ pattern: /\bgit\s+clean\b/, reason: "Git clean", level: "confirm" },
	{
		pattern: /\bgit\s+checkout\s+\./,
		reason: "Discard all working changes",
		level: "confirm",
	},
	{
		pattern: /\bgit\s+restore\s+\./,
		reason: "Restore all working changes",
		level: "confirm",
	},
	{
		pattern: /\bgit\s+push\s+.*--force/,
		reason: "Force push",
		level: "confirm",
	},
	{
		pattern: /\bgit\s+(commit|tag|push)\b/,
		reason: "Git state mutation",
		level: "confirm",
	},
	{ pattern: /\bsudo\b/, reason: "Elevated privileges", level: "confirm" },
	{
		pattern: /\bnpm\s+.*-g\b/,
		reason: "Global package install",
		level: "confirm",
	},
	{
		pattern: /\byarn\s+global\b/,
		reason: "Global package install",
		level: "confirm",
	},
	{
		pattern: /\bpnpm\s+.*-g\b/,
		reason: "Global package install",
		level: "confirm",
	},
];

/**
 * Assess the risk level of a bash command string.
 */
export function assessBashRisk(command: string): GuardResult {
	const normalized = command.trim().toLowerCase();
	// Explicit bypass for interactive confirmations.
	// Usage: include `pi-allow:` after user confirmation.
	// Example: `cd repo && pi-allow: git commit -m "..."`
	if (normalized.includes("pi-allow:")) return { level: "allow" };

	for (const { pattern, reason, level } of DESTRUCTIVE_PATTERNS) {
		if (pattern.test(normalized)) {
			return { level, reason };
		}
	}

	return { level: "allow" };
}

/**
 * Format a confirmation prompt for a risky command.
 */
export function formatConfirmation(
	command: string,
	result: GuardResult,
): string {
	return `⚠️ Guardrail triggered

Command: \`${command}\`
Risk: ${result.reason}
Level: ${result.level}

Proceed?`;
}
