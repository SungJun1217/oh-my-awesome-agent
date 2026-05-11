# oh-my-awesome-agent Improvement Requirements

## Purpose

Track the near-term risks and improvement work identified during repository analysis before implementation. This document keeps the work bounded, verifiable, and aligned with the lightweight pi-native workflow philosophy.

## Scope

Address low-risk repository consistency and health-check issues only. Do not introduce new workflow surfaces, dependencies, daemons, telemetry, or broad architecture changes.

## Requirements

### R1. Documentation reflects the actual package shape

**Problem:** Project documentation describes five prompt templates, but the repository currently ships ten prompt templates.

**Requirement:** Update user/developer-facing documentation so the documented prompt template inventory matches the actual `prompts/` directory.

**Acceptance criteria:**
- README architecture section no longer implies only five prompt templates.
- Project guidance no longer lists a stale prompt count.
- Documentation remains concise and does not over-explain internal implementation details.

### R2. Packaged file manifest is accurate

**Problem:** `package.json` includes `SPEC.md` in `files`, but the file was previously missing.

**Requirement:** Add this requirements specification as `SPEC.md` so the package manifest references an existing file.

**Acceptance criteria:**
- `SPEC.md` exists at the package root.
- Smoke test package path checks continue to pass.

### R3. `/aa-doctor` diagnoses the extension package, not the caller project

**Problem:** The doctor command uses `process.cwd()` to locate `package.json`, `extensions/`, `prompts/`, and `skills/`. When installed as a pi extension and run from another project, `cwd` may refer to the caller project rather than this package.

**Requirement:** Resolve the oh-my-awesome-agent package root from the module location, with a safe fallback, and use that root for doctor checks.

**Acceptance criteria:**
- Doctor checks are based on the package containing `oh-my-awesome-agent`.
- Source and compiled `dist/` execution paths are both handled.
- Existing `/aa-doctor` public behavior is preserved.

### R4. Keep workflow command implementation intent clear

**Problem:** Individual `registerX()` helpers exist for workflow commands, while current runtime behavior uses input transforms for print/RPC safety. This is intentional but can be confusing.

**Requirement:** Preserve the input-transform runtime path and ensure documentation/comments make the intent clear enough for maintainers.

**Acceptance criteria:**
- No reintroduction of workflow `sendUserMessage()` command registration in the main extension path.
- Existing explanatory comments remain or are improved if nearby code changes.

### R5. Route workflow roles to the best available model

**Problem:** All workflow roles currently use whichever model is active, even when the user has configured multiple models with different strengths.

**Requirement:** Before transforming a workflow slash surface, choose the best authenticated model available for that role and set an appropriate thinking level.

**Acceptance criteria:**
- `/ultrawork`, `/ulw`, and `/review` prefer strong coding/reasoning models.
- `/hyperplan` prefers reasoning/planning models.
- `/scout` prefers fast or cost-efficient long-context models.
- `/finish` uses a balanced coding-capable model.
- If no authenticated models are available, the current model is left unchanged and the prompt still runs.
- Models known from live eval to fail for the current subscription surface are excluded from automatic routing while remaining selectable explicitly.
- Model routing remains local to workflow slash surfaces and does not affect `/aa-doctor`.

### R6. Provide a model-routing evaluation harness

**Problem:** Heuristic model routing can be unit-tested, but real model quality requires repeatable live evaluations.

**Requirement:** Add a lightweight eval harness that can run the same workflow tasks against multiple pi model patterns and store comparable results.

**Acceptance criteria:**
- Eval tasks are stored as inspectable files with expected signals and human scoring rubrics.
- A script can run selected tasks against selected `pi --model` patterns.
- The script can include the automatic router as a candidate.
- Results include duration, exit code, raw output, expected-signal coverage, and rubric metadata.
- Initial tasks avoid write-capable implementation benchmarks so they are safe to run in the working tree.

### R7. Provide a theme aligned with routed workflow roles

**Problem:** The package now has explicit workflow-role routing and thinking-level behavior, but no bundled theme that visually reinforces those states.

**Requirement:** Ship a pi theme that highlights routing, scout/review/executor thinking levels, and tool outcomes while remaining usable on dark terminals.

**Acceptance criteria:**
- `package.json` exposes a `themes` resource path.
- The theme defines all required pi color tokens.
- Documentation explains how to select the theme.
- Smoke tests validate theme presence and required color tokens.

## Verification

Run the focused package checks after implementation:

```bash
npm run typecheck
npm test
npm run smoke
```

If only documentation changes are made for a requirement, smoke/typecheck remain sufficient because this package has no docs build step.

## Out of Scope

- Adding new slash commands or personas.
- Changing pi extension APIs.
- Reworking guardrail confirmation UX beyond current API behavior.
- Git repository setup or migration; this workspace may not be a git checkout.
