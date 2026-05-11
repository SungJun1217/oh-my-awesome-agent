import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { setCommandSessionName } from "../utils/session.js";

interface DoctorResult {
	check: string;
	status: "OK" | "WARN" | "CRITICAL";
	details: string;
}

function isAwesomeAgentPackage(dir: string): boolean {
	const pkgPath = path.join(dir, "package.json");
	try {
		const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
		return pkg.name === "oh-my-awesome-agent";
	} catch {
		return false;
	}
}

function findPackageRoot(startDir: string): string | undefined {
	let current = path.resolve(startDir);

	while (true) {
		if (isAwesomeAgentPackage(current)) return current;

		const parent = path.dirname(current);
		if (parent === current) return undefined;
		current = parent;
	}
}

function getPackageRoot(): string {
	const moduleDir = path.dirname(fileURLToPath(import.meta.url));
	return (
		findPackageRoot(moduleDir) ??
		findPackageRoot(process.cwd()) ??
		process.cwd()
	);
}

function diagnose(rootDir = getPackageRoot()): DoctorResult[] {
	const results: DoctorResult[] = [];

	// 1. Extension file exists
	const extPath = path.join(rootDir, "extensions", "awesome.ts");
	if (fs.existsSync(extPath)) {
		results.push({
			check: "Extension file",
			status: "OK",
			details: `Found at ${extPath}`,
		});
	} else {
		results.push({
			check: "Extension file",
			status: "WARN",
			details: "extensions/awesome.ts not found; using src/ build output",
		});
	}

	// 2. package.json pi field
	const pkgPath = path.join(rootDir, "package.json");
	try {
		const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
		if (pkg.pi?.extensions && pkg.pi?.prompts && pkg.pi?.skills) {
			results.push({
				check: "package.json pi manifest",
				status: "OK",
				details: "extensions, prompts, skills configured",
			});
		} else {
			results.push({
				check: "package.json pi manifest",
				status: "CRITICAL",
				details: "Missing pi.extensions, pi.prompts, or pi.skills",
			});
		}
	} catch {
		results.push({
			check: "package.json pi manifest",
			status: "CRITICAL",
			details: "Cannot read package.json",
		});
	}

	// 3. Prompt templates
	const promptsDir = path.join(rootDir, "prompts");
	try {
		const promptFiles = fs
			.readdirSync(promptsDir)
			.filter((f: string) => f.endsWith(".md"));
		results.push({
			check: "Prompt templates",
			status: promptFiles.length > 0 ? "OK" : "WARN",
			details: `${promptFiles.length} templates found`,
		});
	} catch {
		results.push({
			check: "Prompt templates",
			status: "WARN",
			details: "prompts/ directory not readable",
		});
	}

	// 4. Skills
	const skillsDir = path.join(rootDir, "skills");
	try {
		const skillDirs = fs
			.readdirSync(skillsDir)
			.filter((d: string) =>
				fs.statSync(path.join(skillsDir, d)).isDirectory(),
			);
		results.push({
			check: "Skills",
			status: skillDirs.length > 0 ? "OK" : "WARN",
			details: `${skillDirs.length} skills found`,
		});
	} catch {
		results.push({
			check: "Skills",
			status: "WARN",
			details: "skills/ directory not readable",
		});
	}

	// 5. TypeScript compile check
	const tsConfigPath = path.join(rootDir, "tsconfig.smoke.json");
	if (fs.existsSync(tsConfigPath)) {
		results.push({
			check: "TypeScript config",
			status: "OK",
			details: "tsconfig.smoke.json exists",
		});
	} else {
		results.push({
			check: "TypeScript config",
			status: "WARN",
			details: "tsconfig.smoke.json not found",
		});
	}

	// 6. Smoke test script
	const smokePath = path.join(rootDir, "smoke-test.sh");
	if (fs.existsSync(smokePath)) {
		results.push({
			check: "Smoke test script",
			status: "OK",
			details: "smoke-test.sh exists",
		});
	} else {
		results.push({
			check: "Smoke test script",
			status: "WARN",
			details: "smoke-test.sh not found",
		});
	}

	return results;
}

function buildReport(results: DoctorResult[]): string {
	const statusEmoji = {
		OK: "✅",
		WARN: "⚠️",
		CRITICAL: "❌",
	};

	const hasCritical = results.some((r) => r.status === "CRITICAL");
	const summary = hasCritical ? "ISSUES FOUND" : "HEALTHY";

	let report = `## oh-my-awesome-agent Doctor Report\n\n`;
	report += `**Summary:** ${summary}\n\n`;
	report += `| Check | Status | Details |\n`;
	report += `|-------|--------|---------|\n`;

	for (const r of results) {
		report += `| ${r.check} | ${statusEmoji[r.status]} ${r.status} | ${r.details} |\n`;
	}

	const issues = results.filter((r) => r.status !== "OK");
	if (issues.length > 0) {
		report += `\n### Issues Found\n`;
		for (const issue of issues) {
			report += `- **${issue.check}**: ${issue.details}\n`;
		}
	}

	return report;
}

export function registerDoctor(pi: ExtensionAPI): void {
	pi.registerCommand("aa-doctor", {
		description: "Show oh-my-awesome-agent load status",
		handler: async (_args: string, ctx) => {
			setCommandSessionName(pi, "aa-doctor", "");
			const results = diagnose();
			const report = buildReport(results);
			ctx.ui.notify(report, hasCritical(results) ? "warning" : "info");
		},
	});
}

function hasCritical(results: DoctorResult[]): boolean {
	return results.some((r) => r.status === "CRITICAL");
}
