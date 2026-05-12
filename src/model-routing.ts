import type { Api, Model, ModelThinkingLevel } from "@earendil-works/pi-ai";

type WorkflowCommand =
	| "ultrawork"
	| "ulw"
	| "hyperplan"
	| "scout"
	| "review"
	| "finish";

const MODEL_FAMILIES = {
	claude: ["claude"],
	sonnet: ["sonnet"],
	opus: ["opus"],
	gpt5: ["gpt-5"],
	gpt41: ["gpt-4.1"],
	codex: ["codex"],
	coder: ["coder"],
	codestral: ["codestral"],
	devstral: ["devstral"],
	deepseek: ["deepseek"],
	kimi: ["kimi"],
	o3: ["o3"],
	o4: ["o4"],
	pro: ["pro"],
	reason: ["reason"],
	thinking: ["thinking"],
	flash: ["flash"],
	haiku: ["haiku"],
	mini: ["mini"],
	lite: ["lite"],
	fast: ["fast"],
	security: ["security"],
} as const;

type ModelFamily = keyof typeof MODEL_FAMILIES;

interface CommandConfig {
	thinkingLevel: ModelThinkingLevel;
	preferredFamilies: ModelFamily[];
	avoidFamilies?: ModelFamily[];
	bonus: number;
}

const COMMAND_CONFIG: Record<WorkflowCommand, CommandConfig> = {
	ultrawork: {
		thinkingLevel: "high",
		preferredFamilies: ["sonnet", "codex", "coder", "gpt5", "deepseek", "kimi"],
		bonus: 10,
	},
	ulw: {
		thinkingLevel: "high",
		preferredFamilies: ["sonnet", "codex", "coder", "gpt5", "deepseek", "kimi"],
		bonus: 10,
	},
	hyperplan: {
		thinkingLevel: "high",
		preferredFamilies: ["opus", "o3", "o4", "pro", "reason", "thinking"],
		bonus: 10,
	},
	review: {
		thinkingLevel: "high",
		preferredFamilies: ["sonnet", "opus", "codex", "coder", "gpt5", "security"],
		bonus: 10,
	},
	scout: {
		thinkingLevel: "medium",
		preferredFamilies: ["flash", "haiku", "mini", "lite", "fast"],
		avoidFamilies: ["opus"],
		bonus: 8,
	},
	finish: {
		thinkingLevel: "medium",
		preferredFamilies: ["sonnet", "codex", "coder", "flash", "haiku"],
		bonus: 5,
	},
};

function modelKey(model: Model<Api>): string {
	return `${model.provider}/${model.id}`.toLowerCase();
}

function modelText(model: Model<Api>): string {
	return `${modelKey(model)} ${model.name}`.toLowerCase();
}

function isDefaultExcludedModel(model: Model<Api>): boolean {
	const key = modelKey(model);
	return /^openai-codex\/gpt-5\.1(?:$|-)/.test(key);
}

function hasFamily(text: string, family: ModelFamily): boolean {
	return MODEL_FAMILIES[family].some((term) => text.includes(term));
}

function hasAnyFamily(text: string, families: ModelFamily[]): boolean {
	return families.some((family) => hasFamily(text, family));
}

function costScore(model: Model<Api>): number {
	const total = model.cost.input + model.cost.output;
	if (total <= 0) return 4;
	if (total <= 1) return 3;
	if (total <= 5) return 2;
	if (total <= 20) return 1;
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

function supportsThinkingLevel(
	model: Model<Api>,
	level: ModelThinkingLevel,
): boolean {
	if (!model.thinkingLevelMap) {
		return true;
	}
	return (
		model.thinkingLevelMap[level] !== undefined &&
		model.thinkingLevelMap[level] !== null
	);
}

function latencyScore(model: Model<Api>): number {
	const text = modelText(model);

	if (hasAnyFamily(text, ["flash", "haiku", "mini", "lite", "fast"])) {
		return 4;
	}

	if (hasAnyFamily(text, ["opus", "o3", "o4", "pro", "reason", "thinking"])) {
		return -2;
	}

	return 0;
}

export function scoreModelForCommand(
	command: WorkflowCommand,
	model: Model<Api>,
): number {
	const text = modelText(model);
	const config = COMMAND_CONFIG[command];
	let score = commonScore(model);

	if (command !== "scout") {
		if (hasAnyFamily(text, ["claude", "sonnet", "opus", "gpt5", "gpt41"])) {
			score += 6;
		}
		if (
			hasAnyFamily(text, [
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

	if (config.preferredFamilies.length > 0) {
		if (hasAnyFamily(text, config.preferredFamilies)) {
			score += config.bonus;
		}
	}

	if (config.avoidFamilies) {
		if (hasAnyFamily(text, config.avoidFamilies)) {
			score -= 6;
		}
	}

	if (command === "scout") {
		score += costScore(model);
		score += latencyScore(model);
	}

	if (command === "finish") {
		score += latencyScore(model);
	}

	return score;
}

export function selectModelForCommand(
	command: WorkflowCommand,
	models: Model<Api>[],
	current?: Model<Api>,
): Model<Api> | undefined {
	if (models.length === 0) return undefined;

	const config = COMMAND_CONFIG[command];

	const routableModels = models.filter(
		(model) => !isDefaultExcludedModel(model),
	);
	if (routableModels.length === 0) return current ?? models[0];

	const compatibleModels = routableModels.filter((model) =>
		supportsThinkingLevel(model, config.thinkingLevel),
	);

	const candidates =
		compatibleModels.length > 0 ? compatibleModels : routableModels;

	const finalCandidates = current
		? candidates.some(
				(model) =>
					model.provider === current.provider && model.id === current.id,
			)
			? candidates
			: [...candidates, current]
		: candidates;

	return finalCandidates.reduce((best, model) => {
		const bestScore = scoreModelForCommand(command, best);
		const modelScore = scoreModelForCommand(command, model);
		if (modelScore > bestScore) return model;
		if (modelScore === bestScore && current) {
			const isCurrent =
				model.provider === current.provider && model.id === current.id;
			if (isCurrent) return model;
		}
		return best;
	}, finalCandidates[0]);
}

export function thinkingLevelForCommand(
	command: WorkflowCommand,
): ModelThinkingLevel {
	return COMMAND_CONFIG[command].thinkingLevel;
}

export type { WorkflowCommand };
