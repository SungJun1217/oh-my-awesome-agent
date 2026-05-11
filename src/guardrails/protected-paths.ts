/**
 * Protected path guardrails for oh-my-awesome-agent.
 *
 * Flags writes to sensitive files and paths that should require
 * explicit user confirmation.
 */

export type PathRisk = "allow" | "warn" | "confirm" | "block";

interface PathGuardResult {
	level: PathRisk;
	reason?: string;
}

const PROTECTED_PATTERNS: Array<{
	pattern: RegExp;
	reason: string;
	level: PathRisk;
}> = [
	// Environment and secrets
	{
		pattern:
			/(\/|^)(\.env|\.env\.\w+|\.envrc|\.env\.local|\.env\.production|\.env\.development)$/,
		reason: "Environment file",
		level: "confirm",
	},
	{
		pattern: /(\/|^)(secret|secrets|credentials|keys|tokens|private)\.\w+$/i,
		reason: "Secrets file",
		level: "confirm",
	},
	{
		pattern: /\/\.aws\//,
		reason: "AWS credentials directory",
		level: "confirm",
	},
	{ pattern: /\/\.ssh\//, reason: "SSH directory", level: "confirm" },
	{ pattern: /\/\.gnupg\//, reason: "GnuPG directory", level: "confirm" },
	{ pattern: /\/id_rsa/, reason: "SSH private key", level: "confirm" },
	{ pattern: /\/id_ed25519/, reason: "SSH private key", level: "confirm" },

	// Git internals
	{ pattern: /(\/|^)\.git\//, reason: "Git internals", level: "confirm" },
	{ pattern: /\/\.gitignore$/, reason: "Git ignore", level: "warn" },

	// Lockfiles
	{
		pattern:
			/\/(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|Gemfile\.lock|poetry\.lock)$/,
		reason: "Lockfile",
		level: "warn",
	},

	// Generated directories
	{
		pattern: /\/(dist|build|coverage|generated|\.next|target)\//,
		reason: "Generated directory",
		level: "warn",
	},

	// CI/CD and deployment
	{
		pattern: /(\/|^)\.github\/workflows\//,
		reason: "GitHub Actions workflow",
		level: "warn",
	},
	{
		pattern:
			/\/(\.gitlab-ci|Dockerfile|docker-compose|kubernetes|k8s|terraform|\.tf)\b/,
		reason: "Deployment config",
		level: "warn",
	},

	// System paths
	{
		pattern:
			/^(\/etc\/|\/usr\/|\/bin\/|\/sbin\/|\/lib\/|\/sys\/|\/dev\/|\/proc\/)/,
		reason: "System path",
		level: "block",
	},
	{
		pattern: /^(\$HOME\/|~\/)/,
		reason: "Home directory file",
		level: "warn",
	},
];

/**
 * Assess the risk level of writing to a given path.
 */
export function assessPathRisk(filePath: string): PathGuardResult {
	const normalized = filePath.trim();

	for (const { pattern, reason, level } of PROTECTED_PATTERNS) {
		if (pattern.test(normalized)) {
			return { level, reason };
		}
	}

	return { level: "allow" };
}

/**
 * Check if a path looks generated.
 */
export function isGeneratedPath(filePath: string): boolean {
	const generatedPatterns = [
		/(\/|^)dist\//,
		/(\/|^)build\//,
		/(\/|^)coverage\//,
		/(\/|^)generated\//,
		/(\/|^)\.next\//,
		/(\/|^)target\//,
		/(\/|^)(\.svelte-kit|\.nuxt|\.output)\//,
	];
	return generatedPatterns.some((p) => p.test(filePath));
}
