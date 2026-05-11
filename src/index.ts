import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { registerDoctor } from "./commands/doctor.js";
import { createFinishPrompt } from "./commands/finish.js";
import { createHyperplanPrompt } from "./commands/hyperplan.js";
import { createReviewPrompt } from "./commands/review.js";
import { createScoutPrompt } from "./commands/scout.js";
import { createUltraworkPrompt } from "./commands/ultrawork.js";
import { HEADER } from "./constants.js";
import { assessBashRisk } from "./guardrails/bash-guard.js";
import { assessPathRisk } from "./guardrails/protected-paths.js";
import {
	selectModelForCommand,
	thinkingLevelForCommand,
	type WorkflowCommand,
} from "./model-routing.js";
import { setCommandSessionName } from "./utils/session.js";

function parseWorkflowCommand(
	text: string,
): { command: WorkflowCommand; args: string } | undefined {
	const match = text.match(
		/^\/(ultrawork|ulw|hyperplan|scout|review|finish)(?:\s+([\s\S]*))?$/,
	);
	if (!match) return undefined;

	return { command: match[1] as WorkflowCommand, args: match[2] ?? "" };
}

function commandPersonaLabel(command: WorkflowCommand): string {
	switch (command) {
		case "ultrawork":
		case "ulw":
			return "Executor";
		case "hyperplan":
			return "Planner";
		case "scout":
			return "Scout";
		case "review":
			return "Reviewer";
		case "finish":
			return "Finisher";
		default:
			return "Workflow";
	}
}

function transformWorkflowCommand(text: string): string | undefined {
	const parsed = parseWorkflowCommand(text);
	if (!parsed) return undefined;

	const { command, args } = parsed;

	switch (command) {
		case "ultrawork":
		case "ulw":
			return createUltraworkPrompt(args);
		case "hyperplan":
			return createHyperplanPrompt(args);
		case "scout":
			return createScoutPrompt(args);
		case "review":
			return createReviewPrompt(args);
		case "finish":
			return createFinishPrompt(args);
		default:
			return undefined;
	}
}

export default function (pi: ExtensionAPI) {
	// Session start notification
	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.notify(
			"oh-my-awesome-agent loaded: /ultrawork, /scout, /review, /finish",
			"info",
		);
	});

	// Print/RPC-safe slash command transform. Extension commands that call
	// pi.sendUserMessage() can hang in print mode, so transform the initial
	// slash command into the underlying prompt before command dispatch.
	pi.on("input", async (event, ctx) => {
		if (event.source === "extension") return { action: "continue" };
		const text = event.text.trim();
		const parsed = parseWorkflowCommand(text);
		if (!parsed) return { action: "continue" };

		// Make the active workflow/persona visible in the UI.
		setCommandSessionName(pi, parsed.command, parsed.args);
		if (ctx.hasUI) {
			ctx.ui.notify(
				`oh-my-awesome-agent mode: ${commandPersonaLabel(parsed.command)} (/${parsed.command})`,
				"info",
			);
		}

		const shouldRouteModel =
			process.env.OH_MY_AWESOME_AGENT_DISABLE_MODEL_ROUTING !== "1";
		if (shouldRouteModel) {
			const desiredThinkingLevel = thinkingLevelForCommand(parsed.command);
			const availableModels = ctx.modelRegistry.getAvailable();
			const selectedModel = selectModelForCommand(
				parsed.command,
				availableModels,
				ctx.model,
			);
			if (selectedModel) {
				const changed =
					!ctx.model ||
					ctx.model.provider !== selectedModel.provider ||
					ctx.model.id !== selectedModel.id;
				if (changed) {
					const success = await pi.setModel(selectedModel);
					if (success && ctx.hasUI) {
						ctx.ui.notify(
							`oh-my-awesome-agent routed /${parsed.command} to ${selectedModel.provider}/${selectedModel.id}`,
							"info",
						);
					}
				}
			}
			pi.setThinkingLevel(desiredThinkingLevel);
		}

		const transformed = transformWorkflowCommand(text);
		if (!transformed) return { action: "continue" };
		return { action: "transform", text: transformed };
	});

	// System prompt priming for workflow commands
	pi.on("before_agent_start", async (event) => {
		const text = event.prompt.trim().toLowerCase();
		const shouldPrime =
			text.includes("ultrawork") ||
			text.includes("hyperplan") ||
			text.includes("scout") ||
			text.includes("review") ||
			text.includes("finish") ||
			text.includes("끝까지") ||
			text.includes("end-to-end");
		if (!shouldPrime) return;
		return { systemPrompt: `${event.systemPrompt}\n\n${HEADER}` };
	});

	// Bash guardrail: intercept destructive commands
	pi.on("tool_call", async (event) => {
		if (!isToolCallEventType("bash", event)) return;

		const command = event.input.command;
		const result = assessBashRisk(command);

		if (result.level === "block") {
			return {
				block: true,
				reason: `[BLOCKED by oh-my-awesome-agent] ${result.reason}: ${command}`,
			};
		}

		if (result.level === "confirm") {
			return {
				block: true,
				reason: `⚠️ Guardrail triggered\n\nCommand: \`${command}\`\nRisk: ${result.reason}\nLevel: ${result.level}\n\nProceed?`,
			};
		}
	});

	// Edit/Write guardrail: intercept protected paths
	pi.on("tool_call", async (event) => {
		if (isToolCallEventType("edit", event)) {
			const filePath = event.input.path;
			const result = assessPathRisk(filePath);
			if (result.level === "block") {
				return {
					block: true,
					reason: `[BLOCKED by oh-my-awesome-agent] ${result.reason}: ${filePath}`,
				};
			}
			if (result.level === "confirm") {
				return {
					block: true,
					reason: `⚠️ Guardrail triggered\n\nPath: \`${filePath}\`\nRisk: ${result.reason}\nLevel: ${result.level}\n\nProceed?`,
				};
			}
		}

		if (isToolCallEventType("write", event)) {
			const filePath = event.input.path;
			const result = assessPathRisk(filePath);
			if (result.level === "block") {
				return {
					block: true,
					reason: `[BLOCKED by oh-my-awesome-agent] ${result.reason}: ${filePath}`,
				};
			}
			if (result.level === "confirm") {
				return {
					block: true,
					reason: `⚠️ Guardrail triggered\n\nPath: \`${filePath}\`\nRisk: ${result.reason}\nLevel: ${result.level}\n\nProceed?`,
				};
			}
		}
	});

	// Register command-only utilities. Workflow slash surfaces are handled by
	// input transforms and prompt templates so they also work in print/RPC mode.
	registerDoctor(pi);
}
