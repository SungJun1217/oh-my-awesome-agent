# Model Routing Eval Harness

This directory contains a lightweight evaluation harness for checking whether oh-my-awesome-agent's model-routing heuristics match real model behavior.

## What it measures

The harness runs the same workflow tasks against multiple pi models and records:

- exit code
- wall-clock duration
- stdout/stderr
- expected signal coverage
- task rubric for manual scoring

The automatic `signalScore` is only a sanity check. Treat final routing decisions as benchmark-assisted, not fully automated.

## Configure models

Edit `eval/config.json`:

```json
{
  "models": [
    "anthropic/claude-sonnet-4-5:high",
    "google/gemini-2.5-flash:medium",
    "openai/o3-pro:high"
  ]
}
```

Model patterns are passed directly to pi's `--model` flag, so any pattern accepted by pi works.

## Dry run

```bash
npm run eval:models -- --dry-run --models "sonnet:high,gemini-flash:medium" --tasks scout-overview
```

## Run benchmark tasks

```bash
npm run eval:models -- --models "sonnet:high,gemini-flash:medium,o3:high"
```

Include the current automatic router as a candidate:

```bash
npm run eval:models -- --auto-route --models "sonnet:high,gemini-flash:medium,o3:high"
```

Results are written to `eval/results/*.jsonl` and `eval/results/*.md`.

Explicit `--models` runs set `OH_MY_AWESOME_AGENT_DISABLE_MODEL_ROUTING=1` internally so the requested model is benchmarked directly. The `--auto-route` candidate leaves routing enabled.

## Interpreting results

Use this order:

1. Remove failed or timed-out runs.
2. Check whether expected signals are present.
3. Manually score the output against the task rubric.
4. Compare latency and cost if available from pi output/session data.
5. Adjust `src/model-routing.ts` weights only when repeated tasks show a pattern.

## Current task set

- `scout-overview` — repository reconnaissance, read-only
- `hyperplan-model-routing` — planning quality, read-only
- `review-model-routing` — review quality, read-only
- `finish-verify-only` — verification loop quality, no edits

The initial task set intentionally avoids write-capable implementation benchmarks so model comparisons are safe to run in the working tree. Add fixture-based edit tasks later if you want to measure autonomous coding success rates.
