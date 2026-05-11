import type {
	ExtensionAPI,
	ExtensionContext,
	ExtensionUIContext,
} from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";
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
import {
	composeWorkflowEditorText,
	nextWorkflowCommand,
	parseWorkflowCommandText,
	workflowCommandFromSessionName,
	workflowEditorArgs,
	workflowRoleLabel,
	workflowStatusColor,
	workflowStatusText,
} from "./utils/workflow-ui.js";

function transformWorkflowCommand(text: string): string | undefined {
	const parsed = parseWorkflowCommandText(text);
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

type WorkflowUiContext = Pick<
	ExtensionContext,
	"hasUI" | "model" | "modelRegistry"
> & {
	ui: Pick<
		ExtensionUIContext,
		"getEditorText" | "notify" | "setEditorText" | "setStatus" | "theme"
	>;
};

const WORKFLOW_STATUS_KEY = "oh-my-awesome-agent:workflow";

function setWorkflowStatus(
	ctx: WorkflowUiContext,
	command: WorkflowCommand | undefined,
): void {
	if (!ctx.hasUI) return;

	if (!command) {
		ctx.ui.setStatus(WORKFLOW_STATUS_KEY, ctx.ui.theme.fg("dim", "Ready"));
		return;
	}

	ctx.ui.setStatus(
		WORKFLOW_STATUS_KEY,
		ctx.ui.theme.fg(workflowStatusColor(command), workflowStatusText(command)),
	);
}

export default function (pi: ExtensionAPI) {
	let activeWorkflowCommand: WorkflowCommand | undefined;

	async function applyWorkflowCommand(
		ctx: WorkflowUiContext,
		command: WorkflowCommand,
		args: string,
	): Promise<void> {
		setCommandSessionName(pi, command, args);
		activeWorkflowCommand = command;
		setWorkflowStatus(ctx, activeWorkflowCommand);
		if (ctx.hasUI) {
			ctx.ui.notify(
				`oh-my-awesome-agent mode: ${workflowRoleLabel(command)} (/${command})`,
				"info",
			);
		}

		const shouldRouteModel =
			process.env.OH_MY_AWESOME_AGENT_DISABLE_MODEL_ROUTING !== "1";
		if (shouldRouteModel) {
			try {
				const desiredThinkingLevel = thinkingLevelForCommand(command);
				const availableModels = ctx.modelRegistry.getAvailable();
				const selectedModel = selectModelForCommand(
					command,
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
								`oh-my-awesome-agent routed /${command} to ${selectedModel.provider}/${selectedModel.id}`,
								"info",
							);
						}
					}
				}
				pi.setThinkingLevel(desiredThinkingLevel);
			} catch (error) {
				if (ctx.hasUI) {
					ctx.ui.notify(
						`oh-my-awesome-agent model routing failed: ${error instanceof Error ? error.message : String(error)}`,
						"warning",
					);
				}
			}
		}
	}

	// Session start notification
	pi.on("session_start", async (_event, ctx) => {
		activeWorkflowCommand = workflowCommandFromSessionName(pi.getSessionName());
		setWorkflowStatus(ctx, activeWorkflowCommand);
		if (ctx.hasUI) {
			ctx.ui.notify(
				"oh-my-awesome-agent loaded: /ultrawork, /scout, /review, /finish",
				"info",
			);
		}
	});

	// Print/RPC-safe slash command transform. Extension commands that call
	// pi.sendUserMessage() can hang in print mode, so transform the initial
	// slash command into the underlying prompt before command dispatch.
	pi.on("input", async (event, ctx) => {
		if (event.source === "extension") return { action: "continue" };
		const parsed = parseWorkflowCommandText(event.text);
		if (!parsed) return { action: "continue" };

		// Make the active workflow/persona visible in the UI.
		const workflowCtx = ctx as WorkflowUiContext;
		if (!workflowCtx.modelRegistry) {
			return { action: "continue" };
		}
		await applyWorkflowCommand(workflowCtx, parsed.command, parsed.args);

		const transformed = transformWorkflowCommand(event.text);
		if (!transformed) return { action: "continue" };
		return { action: "transform", text: transformed };
	});

	pi.on("model_select", async (_event, ctx) => {
		setWorkflowStatus(ctx, activeWorkflowCommand);
	});

	pi.registerShortcut(Key.ctrlAlt("w"), {
		description: "Cycle workflow mode",
		handler: async (ctx) => {
			const nextCommand = nextWorkflowCommand(activeWorkflowCommand);
			const currentText = ctx.hasUI ? ctx.ui.getEditorText() : "";
			const nextEditorText = composeWorkflowEditorText(
				nextCommand,
				currentText,
			);
			const args = workflowEditorArgs(currentText);

			if (ctx.hasUI) {
				ctx.ui.setEditorText(nextEditorText);
			}

			const workflowCtx = ctx as WorkflowUiContext;
			if (workflowCtx.modelRegistry) {
				await applyWorkflowCommand(workflowCtx, nextCommand, args);
			}
		},
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
