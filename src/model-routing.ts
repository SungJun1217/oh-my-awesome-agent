import type { Api, Model, ModelThinkingLevel } from "@earendil-works/pi-ai";

type WorkflowCommand =
	| "ultrawork"
	| "ulw"
	| "hyperplan"
	| "scout"
	| "review"
	| "finish";

const COMMAND_THINKING_LEVELS: Record<WorkflowCommand, ModelThinkingLevel> = {
	ultrawork: "high",
	ulw: "high",
	hyperplan: "high",
	scout: "medium",
	review: "high",
	finish: "medium",
};

function modelKey(model: Model<Api>): string {
	return `${model.provider}/${model.id}`.toLowerCase();
}

function modelText(model: Model<Api>): string {
	return `${modelKey(model)} ${model.name}`.toLowerCase();
}

function isDefaultExcludedModel(model: Model<Api>): boolean {
	const key = modelKey(model);

	// pi can list subscription-visible Codex models that later fail for some
	// ChatGPT account tiers. Keep the default router away from the variants that
	// failed live eval while still allowing users to select them explicitly.
	return /^openai-codex\/gpt-5\.1(?:$|-)/.test(key);
}

function hasAny(text: string, terms: string[]): boolean {
	return terms.some((term) => text.includes(term));
}

function costScore(model: Model<Api>): number {
	const total = model.cost.input + model.cost.output;
	if (total <= 0) return 4;
	if (total <= 1) return 3;
	if (total <= 5) return 1;
	if (total <= 20) return 0;
	return -2;
}

function commonScore(model: Model<Api>): number {
	let score = 0;
	if (model.reasoning) score += 8;
	if (model.contextWindow >= 200_000) score += 4;
	else if (model.contextWindow >= 128_000) score += 3;
	else if (model.contextWindow >= 64_000) score += 1;
	if (model.maxTokens >= 32_000) score += 2;
	else if (model.maxTokens >= 16_000) score += 1;
	return score;
}

export function scoreModelForCommand(
	command: WorkflowCommand,
	model: Model<Api>,
): number {
	const text = modelText(model);
	let score = commonScore(model);

	if (command !== "scout") {
		if (hasAny(text, ["claude", "sonnet", "opus", "gpt-5", "gpt-4.1"])) {
			score += 6;
		}
		if (
			hasAny(text, [
				"codex",
				"coder",
				"codestral",
				"devstral",
				"deepseek",
				"kimi",
			])
		) {
			score += 7;
		}
	}

	switch (command) {
		case "ultrawork":
		case "ulw":
			score += hasAny(text, [
				"sonnet",
				"codex",
				"coder",
				"gpt-5",
				"deepseek",
				"kimi",
			])
				? 10
				: 0;
			break;
		case "hyperplan":
			score += hasAny(text, ["opus", "o3", "o4", "pro", "reason", "thinking"])
				? 10
				: 0;
			break;
		case "review":
			score += hasAny(text, [
				"sonnet",
				"opus",
				"codex",
				"coder",
				"gpt-5",
				"security",
			])
				? 10
				: 0;
			break;
		case "scout":
			score += costScore(model);
			score += hasAny(text, ["flash", "haiku", "mini", "lite", "fast"]) ? 8 : 0;
			if (hasAny(text, ["opus"])) score -= 6;
			break;
		case "finish":
			score += hasAny(text, ["sonnet", "codex", "coder", "flash", "haiku"])
				? 5
				: 0;
			break;
	}

	return score;
}

export function selectModelForCommand(
	command: WorkflowCommand,
	models: Model<Api>[],
	current?: Model<Api>,
): Model<Api> | undefined {
	if (models.length === 0) return undefined;

	const routableModels = models.filter(
		(model) => !isDefaultExcludedModel(model),
	);
	if (routableModels.length === 0) return current ?? models[0];

	const candidates = current
		? routableModels.some(
				(model) =>
					model.provider === current.provider && model.id === current.id,
			)
			? routableModels
			: [...routableModels, current]
		: routableModels;

	return candidates.reduce((best, model) => {
		const bestScore = scoreModelForCommand(command, best);
		const modelScore = scoreModelForCommand(command, model);
		if (modelScore > bestScore) return model;
		if (modelScore === bestScore && current) {
			const isCurrent =
				model.provider === current.provider && model.id === current.id;
			if (isCurrent) return model;
		}
		return best;
	}, candidates[0]);
}

export function thinkingLevelForCommand(
	command: WorkflowCommand,
): ModelThinkingLevel {
	return COMMAND_THINKING_LEVELS[command];
}

export type { WorkflowCommand };
