#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = {
    config: "eval/config.json",
    models: undefined,
    tasks: undefined,
    dryRun: false,
    autoRoute: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--config") args.config = argv[++index];
    else if (arg === "--models") args.models = argv[++index];
    else if (arg === "--tasks") args.tasks = argv[++index];
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--auto-route") args.autoRoute = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/eval-harness.mjs [options]

Options:
  --models <a,b>    Comma-separated pi model patterns to benchmark
  --tasks <a,b>     Comma-separated task ids or task json paths
  --auto-route      Add one run with no --model so oh-my-awesome-agent routes automatically
  --dry-run         Print planned runs without invoking pi
  --config <path>   Config path (default: eval/config.json)
`);
}

function readJson(relativeOrAbsolutePath) {
  const fullPath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(rootDir, relativeOrAbsolutePath);
  return JSON.parse(readFileSync(fullPath, "utf-8"));
}

function splitCsv(value) {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : undefined;
}

function loadTasks(config, taskFilter) {
  const taskRefs = taskFilter ?? config.tasks;
  const allConfiguredTasks = config.tasks.map((taskPath) => readJson(taskPath));

  return taskRefs.map((ref) => {
    if (ref.endsWith(".json") || ref.includes("/")) return readJson(ref);

    const found = allConfiguredTasks.find((task) => task.id === ref);
    if (!found) throw new Error(`Task not found in config: ${ref}`);
    return found;
  });
}

function scoreExpectedSignals(output, expectedSignals = []) {
  const normalized = output.toLowerCase();
  const matched = expectedSignals.filter((signal) =>
    normalized.includes(String(signal).toLowerCase()),
  );
  return {
    matched,
    missing: expectedSignals.filter((signal) => !matched.includes(signal)),
    score: expectedSignals.length === 0 ? 1 : matched.length / expectedSignals.length,
  };
}

function buildCommand(config, task, model) {
  const args = ["-p", "--no-session", "-e", config.extensionPath ?? "."];
  if (model !== "__auto__") args.push("--model", model);
  args.push(`/${task.command} ${task.prompt}`);
  return { command: config.piCommand ?? "pi", args };
}

function runOne(config, task, model) {
  const startedAt = new Date();
  const started = Date.now();
  const command = buildCommand(config, task, model);
  const result = spawnSync(command.command, command.args, {
    cwd: rootDir,
    encoding: "utf-8",
    env: {
      ...process.env,
      ...(model === "__auto__"
        ? {}
        : { OH_MY_AWESOME_AGENT_DISABLE_MODEL_ROUTING: "1" }),
    },
    timeout: config.timeoutMs ?? 300000,
  });
  const durationMs = Date.now() - started;
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const signals = scoreExpectedSignals(stdout + "\n" + stderr, task.expectedSignals);

  return {
    taskId: task.id,
    command: task.command,
    model,
    startedAt: startedAt.toISOString(),
    durationMs,
    exitCode: result.status,
    timedOut: Boolean(result.error && result.error.code === "ETIMEDOUT"),
    signalScore: signals.score,
    matchedSignals: signals.matched,
    missingSignals: signals.missing,
    stdout,
    stderr,
    rubric: task.rubric,
  };
}

function summarize(results) {
  const rows = [
    "| Task | Model | Exit | Duration | Signal Score | Missing Signals |",
    "|------|-------|------|----------|--------------|-----------------|",
  ];

  for (const result of results) {
    rows.push(
      `| ${result.taskId} | ${result.model} | ${result.exitCode ?? "error"} | ${(
        result.durationMs / 1000
      ).toFixed(1)}s | ${(result.signalScore * 100).toFixed(0)}% | ${
        result.missingSignals.join(", ") || "none"
      } |`,
    );
  }

  return `# oh-my-awesome-agent Eval Results\n\n${rows.join("\n")}\n\n## Notes\n\n- Signal score is a lightweight automatic check, not a quality grade.\n- Use each task rubric in the JSONL output for human scoring.\n- Explicit model runs set OH_MY_AWESOME_AGENT_DISABLE_MODEL_ROUTING=1 so they benchmark the requested model instead of the router.\n- Compare duration, exit code, signal score, and manual quality before changing routing weights.\n`;
}

const args = parseArgs(process.argv.slice(2));
const config = readJson(args.config);
const models = splitCsv(args.models) ?? config.models ?? [];
const taskFilter = splitCsv(args.tasks);
const tasks = loadTasks(config, taskFilter);
const runModels = args.autoRoute ? ["__auto__", ...models] : models;

if (runModels.length === 0) {
  throw new Error(
    "No models configured. Add eval/config.json models, pass --models, or use --auto-route.",
  );
}

const planned = tasks.flatMap((task) =>
  runModels.map((model) => ({ task, model, command: buildCommand(config, task, model) })),
);

if (args.dryRun) {
  for (const plan of planned) {
    console.log(
      `${plan.task.id} [${plan.model}]: ${plan.command.command} ${plan.command.args
        .map((arg) => JSON.stringify(arg))
        .join(" ")}`,
    );
  }
  process.exit(0);
}

const outputDir = path.join(rootDir, config.outputDir ?? "eval/results");
mkdirSync(outputDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const jsonlPath = path.join(outputDir, `${stamp}.jsonl`);
const summaryPath = path.join(outputDir, `${stamp}.md`);
const results = [];

for (const plan of planned) {
  console.error(`Running ${plan.task.id} with ${plan.model}...`);
  const result = runOne(config, plan.task, plan.model);
  results.push(result);
  writeFileSync(jsonlPath, `${results.map((item) => JSON.stringify(item)).join("\n")}\n`);
}

writeFileSync(summaryPath, summarize(results));
console.log(`Wrote ${jsonlPath}`);
console.log(`Wrote ${summaryPath}`);
