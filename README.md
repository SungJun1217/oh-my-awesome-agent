# oh-my-awesome-agent

[![CI](https://github.com/jun/oh-my-awesome-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/jun/oh-my-awesome-agent/actions/workflows/ci.yml)

Lightweight Ralph-loop workflow pack for **pi**.

It adds disciplined commands, prompts, and skills without tmux teams, daemons, telemetry, or heavy installers.

## Philosophy

> "Type one command, get a disciplined coding agent that scouts, plans, implements, reviews, verifies, and reports."

- **Easy to inspect** — everything is a file you can read
- **Easy to remove** — no background services or global state
- **Pi-native** — built on pi's extension/prompt/skill system
- **Minimal by default** — only what you invoke is loaded
- **Honest truth states** — never claims "finished" when checks still fail

## Commands

| Slash surface | Role | Edits? | Purpose |
|---------|------|--------|---------|
| `/ultrawork` <task> | Executor | ✅ | End-to-end implementation loop |
| `/ulw` <task> | Alias | ✅ | Short alias for `/ultrawork` |
| `/hyperplan` <task> | Planner | ❌ | Adversarial planning before coding |
| `/scout` <question> | Scout | ❌ | Repository reconnaissance |
| `/review` [target] | Reviewer | ❌* | High-signal code review |
| `/finish` [instructions] | Finisher | ✅ | Close the loop on current work |
| `/aa-doctor` | Diagnostician | ❌ | Installation health check |

* `/review fix` may apply narrow safe fixes.

## Install

Try without installing:

```bash
pi -e /path/to/oh-my-awesome-agent
```

Install globally:

```bash
pi install /path/to/oh-my-awesome-agent
```

Install for one project:

```bash
pi install -l /path/to/oh-my-awesome-agent
```

Remove:

```bash
pi remove /path/to/oh-my-awesome-agent
```

## Quick Start

```text
/ultrawork add input validation to the signup form
/ulw fix the failing auth test
/hyperplan refactor auth middleware
/scout where is auth handled?
/review
/finish
/skill:awesome-workflow
```

## Core Loop

All edit-capable commands follow the Ralph loop:

```text
understand → scout → plan → act → review → verify → decide
```

**Truth states:**
- `finished` — complete, checks passed
- `finished-with-notes` — complete, unrelated/pre-existing issues remain
- `blocked` — needs user decision or risky action
- `partial` — progress made, could not fully verify

## Architecture

```
oh-my-awesome-agent/
├── extensions/awesome.ts      # Conventional pi package wrapper
├── src/
│   ├── index.ts               # Input transforms, /aa-doctor, and guardrail registration
│   ├── constants.ts           # Shared prompt fragments
│   ├── commands/              # Command implementations
│   │   ├── ultrawork.ts
│   │   ├── hyperplan.ts
│   │   ├── scout.ts
│   │   ├── review.ts
│   │   ├── finish.ts
│   │   └── doctor.ts
│   ├── guardrails/            # Safety interceptors
│   │   ├── bash-guard.ts
│   │   └── protected-paths.ts
│   └── utils/
│       └── session.ts
├── prompts/                   # Workflow and persona prompt templates
├── skills/                    # 5 workflow skills
├── themes/                    # TUI themes
└── tests/                     # Unit and smoke tests
```

## Runtime behavior

Workflow slash surfaces are implemented as input transforms plus prompt templates. This avoids `registerCommand -> sendUserMessage` hangs in non-interactive `--print` mode while preserving slash UX.

`/aa-doctor` remains a real registered pi command because it reports extension health via UI notification.

## Theme

This package includes the `awesome-agent` theme for the newer model-routing workflow. It emphasizes routing/status cyan, scout medium-thinking blue, executor/review high-thinking violet, and clear tool success/error states.

Select it from `/settings` or set:

```json
{
  "theme": "awesome-agent"
}
```

## Guardrails

oh-my-awesome-agent includes lightweight guardrails that intercept risky actions:

**Bash guardrail:**
- Confirms before: `rm`, `git reset --hard`, `git push --force`, `sudo`, global installs
- Blocks: recursive delete from root/home, secret exfiltration

**Path guardrail:**
- Confirms before: `.env*`, secrets, SSH keys, lockfiles
- Warns: generated directories, CI configs
- Blocks: system paths (`/etc`, `/usr`, etc.)

## Development

```bash
# Type check
npm run typecheck

# Smoke test
npm run smoke
```

## Design Principles

1. **Command contract first** — every command defines intent, allowed/forbidden actions, output shape, and when to ask the user
2. **Bounded context gathering** — don't read the whole repo blindly
3. **Evidence before action** — know where code lives before editing
4. **Verification is part of the task** — a task isn't done when files are edited
5. **Progressive disclosure** — short prompts for common flows, skills for deep guidance
6. **Safe autonomy** — destructive commands require confirmation
7. **No fake parallelism** — don't pretend to run multiple agents

## License

MIT
