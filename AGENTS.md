# oh-my-awesome-agent — Pi Workflow Pack

**Version:** 0.2.0 | **Type:** pi extension package

## OVERVIEW

Lightweight Ralph-loop workflow pack for [pi](https://github.com/earendil-works/pi-coding-agent). Adds disciplined commands, prompts, and skills without tmux teams, daemons, telemetry, or heavy installers.

**Philosophy:** Type one command, get a disciplined coding agent that scouts, plans, implements, reviews, verifies, and reports.

## STRUCTURE

```
oh-my-awesome-agent/
├── extensions/awesome.ts      # Extension entrypoint (re-exports src/)
├── src/
│   ├── index.ts               # Input transforms, /aa-doctor, and guardrail registration
│   ├── constants.ts           # Shared prompt fragments (HEADER, LOOP_RULES, etc.)
│   ├── commands/              # 6 command implementations
│   │   ├── ultrawork.ts       # End-to-end executor
│   │   ├── hyperplan.ts       # Planner (read-only)
│   │   ├── scout.ts           # Repository reconnaissance
│   │   ├── review.ts          # Code reviewer
│   │   ├── finish.ts          # Loop closer
│   │   └── doctor.ts          # Health check
│   ├── guardrails/            # Safety interceptors
│   │   ├── bash-guard.ts      # Destructive command blocking
│   │   └── protected-paths.ts # Sensitive path blocking
│   └── utils/session.ts       # Session naming utilities
├── prompts/                   # Workflow and persona prompt templates
│   ├── ultrawork.md
│   ├── ulw.md
│   ├── hyperplan.md
│   ├── scout.md
│   ├── review.md
│   ├── finish.md
│   ├── architect.md
│   ├── debugger.md
│   ├── researcher.md
│   └── verifier.md
├── skills/                    # 5 workflow skills
│   ├── awesome-workflow/
│   ├── repo-scout/
│   ├── code-review/
│   ├── safe-editing/
│   └── doctor/
├── themes/                    # TUI themes
│   └── awesome-agent.json
└── tests/                     # Unit tests (vitest)
```

## SLASH SURFACES

Workflow slash surfaces are implemented with input transforms and prompt templates so they work in print/RPC mode. `/aa-doctor` is a registered command.

| Slash surface | Role | Edits? | When to use |
|---------|------|--------|-------------|
| `/ultrawork <task>` | Executor | ✅ | Implement a feature, fix a bug, refactor |
| `/ulw <task>` | Alias | ✅ | Short alias for `/ultrawork` |
| `/hyperplan <task>` | Planner | ❌ | Plan before coding, critique approaches |
| `/scout <question>` | Scout | ❌ | Find where something lives, map codebase |
| `/review [target]` | Reviewer | ❌* | Review diffs, files, or topics |
| `/finish [instructions]` | Finisher | ✅ | Close the loop on current work |
| `/aa-doctor` | Diagnostician | ❌ | Check installation health |

* `/review fix` may apply narrow safe fixes.

## DESIGN PRINCIPLES

1. **Command contract first** — every command defines intent, allowed/forbidden actions, output shape, and when to ask the user
2. **Bounded context gathering** — don't read the whole repo blindly; soft limits: tiny 1-3 files, normal 3-8, large 8-15
3. **Evidence before action** — locate relevant code and patterns before editing
4. **Verification is part of the task** — a task isn't done when files are edited; run focused checks
5. **Progressive disclosure** — short prompts for common flows, skills for deep guidance
6. **Safe autonomy** — destructive commands require confirmation; blocked at extension level
7. **No fake parallelism** — don't pretend to run multiple agents unless real subprocesses are used

## CORE LOOP (Ralph Loop)

All edit-capable commands follow:

```
understand → scout → plan → act → review → verify → decide
```

### Stage Descriptions

| Stage | Purpose | Key Rule |
|-------|---------|----------|
| **understand** | Clarify intent, constraints, success criteria | Ask only if blocked |
| **scout** | Gather bounded evidence | Inspect before editing |
| **plan** | Choose approach and checks | Right-size to complexity |
| **act** | Make scoped changes | Smallest correct change |
| **review** | Find task-related issues | Self-review before reporting |
| **verify** | Run focused checks | Prefer targeted over full suite |
| **decide** | Finish / continue / block | Honest truth state only |

### Safe Continuation Rules

Continue autonomously only when ALL are true:
- Failure is related to current task
- Next fix is scoped and reversible
- No protected path or destructive operation required
- No product decision needed
- Evidence of progress from previous iteration

## TRUTH STATES

End every edit-capable loop with exactly one state:

| State | Meaning |
|-------|---------|
| `finished` | Complete and relevant checks passed |
| `finished-with-notes` | Complete, but unrelated/pre-existing failures remain |
| `blocked` | Needs user decision, risky action, or credential |
| `partial` | Progress made, but budget/environment blocked full completion |

**Rule:** Never claim `finished` if known task-related checks still fail.

## GUARDRAILS

Extension-level safety interceptors via `tool_call` event handlers:

### Bash Guardrail
- **Blocks:** `rm -rf /`, `rm -rf $HOME`, recursive delete outside workspace, `env | curl ...`
- **Confirms:** `rm`, `git reset --hard`, `git push --force`, `sudo`, global package installs

### Path Guardrail
- **Blocks:** System paths (`/etc`, `/usr`, etc.)
- **Confirms:** `.env*`, secrets files, SSH keys, lockfiles, generated directories
- **Warns:** CI configs, deployment configs

## OUTPUT CONTRACTS

### ultrawork / finish

```markdown
## Changes Made
- `path:line-range` — description

## Verification
- `command` → `result`

## Assumptions / Notes
- ...

## Summary
- 1-2 sentence outcome with truth state
```

### hyperplan

```markdown
## Plan Review
**Goal:** ...
**Revised plan:** 1. ...
**Risks:** ...
**Confidence:** high | medium | low
**Recommendation:** Proceed with: `/ultrawork ...`
```

### scout

```markdown
## Scout Findings
**Relevant files:**
- `path`: why it matters
**Suggested next step:** `/hyperplan ...` or `/ultrawork ...`
```

### review

```markdown
## Review Summary
**Findings:**
1. [severity] `path:line` — title
**Overall:** approve / approve with notes / changes requested / blocked
```

## DEVELOPMENT

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format

# Test
npm test

# Smoke test
npm run smoke

# All checks
npm run typecheck && npm run lint && npm test && npm run smoke
```

## EXTENSION API USAGE

- `pi.on("input", handler)` — transform workflow slash inputs into prompts for print/RPC-safe execution
- `pi.registerCommand(name, { description, handler })` — register command-only utilities like `/aa-doctor`
- `pi.on("session_start", handler)` — session initialization
- `pi.on("before_agent_start", handler)` — system prompt priming
- `pi.on("tool_call", handler)` — guardrail interception (return `{ block: true, reason }` to block)
- `pi.sendUserMessage(prompt)` — trigger agent with constructed prompt
- `pi.setSessionName(name)` — set session display name
