import type { WorkflowCommand } from "../model-routing.js";

type WorkflowRoleMeta = {
	label: string;
	icon: string;
	statusColor:
		| "thinkingLow"
		| "thinkingMedium"
		| "thinkingHigh"
		| "thinkingXhigh";
};

const WORKFLOW_ROLE_META: Record<WorkflowCommand, WorkflowRoleMeta> = {
	ultrawork: {
		label: "Executor",
		icon: "🛠",
		statusColor: "thinkingHigh",
	},
	ulw: {
		label: "Executor",
		icon: "🛠",
		statusColor: "thinkingHigh",
	},
	hyperplan: {
		label: "Planner",
		icon: "🧭",
		statusColor: "thinkingXhigh",
	},
	scout: {
		label: "Scout",
		icon: "🔎",
		statusColor: "thinkingLow",
	},
	review: {
		label: "Reviewer",
		icon: "🧪",
		statusColor: "thinkingMedium",
	},
	finish: {
		label: "Finisher",
		icon: "🏁",
		statusColor: "thinkingMedium",
	},
};

const WORKFLOW_COMMANDS = new Set<WorkflowCommand>([
	"ultrawork",
	"ulw",
	"hyperplan",
	"scout",
	"review",
	"finish",
]);

const WORKFLOW_COMMAND_ORDER: WorkflowCommand[] = [
	"ulw",
	"hyperplan",
	"scout",
	"review",
	"finish",
];

const WORKFLOW_COMMAND_PATTERN =
	/^\/(ultrawork|ulw|hyperplan|scout|review|finish)(?:\s+([\s\S]*))?$/;

function normalizeWorkflowCommand(command: WorkflowCommand): WorkflowCommand {
	return command === "ultrawork" ? "ulw" : command;
}

export function parseWorkflowCommandText(
	text: string,
): { command: WorkflowCommand; args: string } | undefined {
	const match = text.trim().match(WORKFLOW_COMMAND_PATTERN);
	if (!match) return undefined;

	return { command: match[1] as WorkflowCommand, args: match[2] ?? "" };
}

export function workflowEditorArgs(text: string): string {
	const parsed = parseWorkflowCommandText(text);
	return parsed ? parsed.args : text.trim();
}

export function composeWorkflowEditorText(
	command: WorkflowCommand,
	text: string,
): string {
	const args = workflowEditorArgs(text);
	return args ? `/${command} ${args}` : `/${command} `;
}

export function nextWorkflowCommand(
	current: WorkflowCommand | undefined,
): WorkflowCommand {
	const firstCommand = WORKFLOW_COMMAND_ORDER[0] ?? "ulw";
	if (!current) return firstCommand;

	const normalized = normalizeWorkflowCommand(current);
	const index = WORKFLOW_COMMAND_ORDER.indexOf(normalized);
	if (index < 0) return firstCommand;

	return (
		WORKFLOW_COMMAND_ORDER[(index + 1) % WORKFLOW_COMMAND_ORDER.length] ??
		firstCommand
	);
}

export function workflowRoleLabel(command: WorkflowCommand): string {
	return WORKFLOW_ROLE_META[command].label;
}

export function workflowStatusColor(
	command: WorkflowCommand,
): WorkflowRoleMeta["statusColor"] {
	return WORKFLOW_ROLE_META[command].statusColor;
}

export function workflowStatusText(command: WorkflowCommand): string {
	const meta = WORKFLOW_ROLE_META[command];
	return `${meta.icon} ${meta.label}`;
}

export function workflowCommandFromSessionName(
	sessionName: string | undefined,
): WorkflowCommand | undefined {
	const prefix = sessionName?.split(":")[0]?.trim().toLowerCase();
	if (!prefix) return undefined;
	return WORKFLOW_COMMANDS.has(prefix as WorkflowCommand)
		? (prefix as WorkflowCommand)
		: undefined;
}
