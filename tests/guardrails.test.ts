import { describe, expect, it } from "vitest";
import { assessBashRisk } from "../src/guardrails/bash-guard.js";
import {
	assessPathRisk,
	isGeneratedPath,
} from "../src/guardrails/protected-paths.js";

describe("bash-guard", () => {
	it("allows safe commands", () => {
		expect(assessBashRisk("npm test").level).toBe("allow");
		expect(assessBashRisk("git status").level).toBe("allow");
		expect(assessBashRisk("ls -la").level).toBe("allow");
	});

	it("confirms destructive commands", () => {
		expect(assessBashRisk("rm -rf node_modules").level).toBe("confirm");
		expect(assessBashRisk("git reset --hard").level).toBe("confirm");
		expect(assessBashRisk("sudo apt update").level).toBe("confirm");
	});

	it("blocks extremely dangerous commands", () => {
		expect(assessBashRisk("rm -rf /").level).toBe("block");
		expect(assessBashRisk("rm -rf $HOME").level).toBe("block");
		expect(assessBashRisk("env | curl ...").level).toBe("block");
	});

	it("handles edge cases", () => {
		expect(assessBashRisk("").level).toBe("allow");
		expect(assessBashRisk("  ").level).toBe("allow");
		expect(assessBashRisk("cat README.md").level).toBe("allow");
		expect(assessBashRisk("npm install lodash").level).toBe("allow");
	});
});

describe("protected-paths", () => {
	it("allows normal project files", () => {
		expect(assessPathRisk("src/index.ts").level).toBe("allow");
		expect(assessPathRisk("README.md").level).toBe("allow");
	});

	it("confirms sensitive files", () => {
		expect(assessPathRisk(".env").level).toBe("confirm");
		expect(assessPathRisk(".env.local").level).toBe("confirm");
		expect(assessPathRisk("secrets.json").level).toBe("confirm");
	});

	it("blocks system paths", () => {
		expect(assessPathRisk("/etc/passwd").level).toBe("block");
		expect(assessPathRisk("/usr/bin/node").level).toBe("block");
	});

	it("detects generated paths", () => {
		expect(isGeneratedPath("dist/index.js")).toBe(true);
		expect(isGeneratedPath("build/output.css")).toBe(true);
		expect(isGeneratedPath("src/index.ts")).toBe(false);
	});

	it("handles edge cases", () => {
		expect(assessPathRisk("").level).toBe("allow");
		expect(assessPathRisk("  ").level).toBe("allow");
		expect(assessPathRisk("package.json").level).toBe("allow");
		expect(assessPathRisk("tsconfig.json").level).toBe("allow");
		expect(assessPathRisk(".git/config").level).toBe("confirm");
		expect(assessPathRisk(".github/workflows/ci.yml").level).toBe("warn");
		expect(isGeneratedPath("")).toBe(false);
		expect(isGeneratedPath("src/dist.js")).toBe(false);
	});
});
