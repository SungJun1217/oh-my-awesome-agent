import { describe, expect, it } from "vitest";
import {
	composeWorkflowEditorText,
	nextWorkflowCommand,
	parseWorkflowCommandText,
	workflowCommandFromSessionName,
	workflowRoleLabel,
	workflowStatusColor,
	workflowStatusText,
} from "../src/utils/workflow-ui.js";

describe("workflow ui helpers", () => {
	it("maps workflow commands to visible labels", () => {
		expect(workflowRoleLabel("ultrawork")).toBe("Executor");
		expect(workflowRoleLabel("hyperplan")).toBe("Planner");
		expect(workflowRoleLabel("scout")).toBe("Scout");
		expect(workflowRoleLabel("review")).toBe("Reviewer");
		expect(workflowRoleLabel("finish")).toBe("Finisher");
	});

	it("maps workflow commands to footer colors", () => {
		expect(workflowStatusColor("scout")).toBe("thinkingLow");
		expect(workflowStatusColor("finish")).toBe("thinkingMedium");
		expect(workflowStatusColor("ulw")).toBe("thinkingHigh");
		expect(workflowStatusColor("hyperplan")).toBe("thinkingXhigh");
	});

	it("formats the status text for the UI footer", () => {
		expect(workflowStatusText("scout")).toContain("Scout");
		expect(workflowStatusText("review")).toContain("Reviewer");
		expect(workflowStatusText("finish")).toContain("🏁");
	});

	it("reads workflow mode from session names", () => {
		expect(workflowCommandFromSessionName("scout: inspect repo")).toBe("scout");
		expect(workflowCommandFromSessionName("ulw: fix bug")).toBe("ulw");
		expect(workflowCommandFromSessionName("custom session")).toBeUndefined();
		expect(workflowCommandFromSessionName(undefined)).toBeUndefined();
	});

	it("cycles workflow modes in a stable order", () => {
		expect(nextWorkflowCommand(undefined)).toBe("ulw");
		expect(nextWorkflowCommand("ulw")).toBe("hyperplan");
		expect(nextWorkflowCommand("ultrawork")).toBe("hyperplan");
		expect(nextWorkflowCommand("review")).toBe("finish");
		expect(nextWorkflowCommand("finish")).toBe("ulw");
	});

	it("rewrites the editor prefix when cycling workflow modes", () => {
		expect(composeWorkflowEditorText("scout", "fix the login flow")).toBe(
			"/scout fix the login flow",
		);
		expect(composeWorkflowEditorText("review", "/ulw fix the login flow")).toBe(
			"/review fix the login flow",
		);
		expect(parseWorkflowCommandText("/finish wrap it up")).toEqual({
			command: "finish",
			args: "wrap it up",
		});
	});
});
