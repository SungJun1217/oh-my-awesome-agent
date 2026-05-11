import type { Api, Model } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import extension from "../src/index.js";
import {
	selectModelForCommand,
	thinkingLevelForCommand,
} from "../src/model-routing.js";
import { compactTask } from "../src/utils/session.js";

describe("session utils", () => {
	it("compactTask returns args when provided", () => {
		expect(compactTask("do something", "fallback")).toBe("do something");
	});

	it("compactTask returns fallback when args is empty", () => {
		expect(compactTask("", "fallback")).toBe("fallback");
		expect(compactTask("   ", "fallback")).toBe("fallback");
	});

	it("compactTask trims whitespace", () => {
		expect(compactTask("  task  ", "fallback")).toBe("task");
	});
});

describe("constants exports", () => {
	it("constants module loads without error", async () => {
		const mod = await import("../src/constants.js");
		expect(typeof mod.HEADER).toBe("string");
		expect(typeof mod.LOOP_RULES).toBe("string");
		expect(typeof mod.SHARED_CONSTRAINTS).toBe("string");
		expect(typeof mod.SHARED_STYLE).toBe("string");
		expect(typeof mod.TRUTH_STATES).toBe("string");
	});

	it("HEADER contains expected content", async () => {
		const { HEADER } = await import("../src/constants.js");
		expect(HEADER).toContain("oh-my-awesome-agent");
		expect(HEADER).toContain("Ralph-loop");
	});
});

describe("extension loading", () => {
	it("does not call runtime action methods during registration", () => {
		const handlers: Record<string, unknown> = {};
		const shortcuts: Array<{ shortcut: string; description?: string }> = [];
		const pi = {
			on: (eventName: string, handler: unknown) => {
				handlers[eventName] = handler;
			},
			registerCommand: () => {},
			registerShortcut: (
				shortcut: string,
				options: { description?: string },
			) => {
				shortcuts.push({ shortcut, description: options.description });
			},
			getSessionName: () => {
				throw new Error("runtime action called during extension loading");
			},
		} as unknown as Parameters<typeof extension>[0];

		expect(() => extension(pi)).not.toThrow();
		expect(Object.keys(handlers)).toContain("session_start");
		expect(shortcuts).toEqual([
			{ shortcut: "ctrl+alt+w", description: "Cycle workflow mode" },
		]);
	});
});

function model(
	provider: string,
	id: string,
	overrides: Partial<Model<Api>> = {},
): Model<Api> {
	return {
		id,
		name: id,
		api: "openai-completions",
		provider,
		baseUrl: "https://example.test/v1",
		reasoning: false,
		input: ["text"],
		cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128_000,
		maxTokens: 16_000,
		...overrides,
	};
}

describe("model routing", () => {
	it("routes coding workflows to coding-capable models", () => {
		const models = [
			model("google", "gemini-2.5-flash", {
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			}),
			model("anthropic", "claude-sonnet-4-5", { reasoning: true }),
			model("local", "qwen-coder-32b", { reasoning: true }),
		];

		expect(selectModelForCommand("ultrawork", models)?.id).toBe(
			"qwen-coder-32b",
		);
		expect(selectModelForCommand("review", models)?.id).toBe("qwen-coder-32b");
	});

	it("routes scout to fast or cheap long-context models", () => {
		const models = [
			model("anthropic", "claude-opus-4-1", {
				reasoning: true,
				cost: { input: 15, output: 75, cacheRead: 0, cacheWrite: 0 },
			}),
			model("google", "gemini-2.5-flash", {
				contextWindow: 1_000_000,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			}),
		];

		expect(selectModelForCommand("scout", models)?.id).toBe("gemini-2.5-flash");
	});

	it("keeps current model on exact score ties", () => {
		const current = model("local", "model-b");
		const models = [model("local", "model-a"), current];

		expect(selectModelForCommand("finish", models, current)?.id).toBe(
			"model-b",
		);
	});

	it("does not auto-route to default-excluded subscription-problem models", () => {
		const models = [
			model("openai-codex", "gpt-5.1-codex-mini", {
				reasoning: true,
				contextWindow: 272_000,
				maxTokens: 128_000,
			}),
			model("openai-codex", "gpt-5.4-mini", {
				reasoning: true,
				contextWindow: 272_000,
				maxTokens: 128_000,
			}),
		];

		expect(selectModelForCommand("scout", models)?.id).toBe("gpt-5.4-mini");
	});

	it("maps workflow commands to thinking levels", () => {
		expect(thinkingLevelForCommand("ultrawork")).toBe("high");
		expect(thinkingLevelForCommand("hyperplan")).toBe("high");
		expect(thinkingLevelForCommand("scout")).toBe("medium");
		expect(thinkingLevelForCommand("finish")).toBe("medium");
	});
});
