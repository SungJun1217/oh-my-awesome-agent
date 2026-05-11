---
name: doctor
description: Diagnose and fix oh-my-awesome-agent installation and configuration issues
---

<Purpose>
Diagnose and fix oh-my-awesome-agent installation issues.
</Purpose>

<Use_When>
- User invokes `/aa-doctor`.
- Commands are not appearing in pi.
- Prompts or skills are not loading.
- After installation or update.
</Use_When>

<Do_Not_Use_When>
- User is reporting a bug in behavior; use `/review` or `/ultrawork`.
- User wants general pi troubleshooting; refer to pi documentation.
</Do_Not_Use_When>

<Checks>
## Step 1: Extension file
Check that `extensions/awesome.ts` exists and exports a default function.

## Step 2: package.json pi manifest
Verify `pi.extensions`, `pi.prompts`, and `pi.skills` arrays exist.

## Step 3: Prompt templates
Count `.md` files in `prompts/` directory.
Verify each has frontmatter and `$ARGUMENTS` placeholder.

## Step 4: Skills
Count subdirectories in `skills/`.
Verify each has `SKILL.md` with frontmatter (`name`, `description`).

## Step 5: TypeScript config
Check `tsconfig.smoke.json` or equivalent exists.

## Step 6: Smoke test script
Check `smoke-test.sh` exists and is executable.

## Step 7: pi installation
Run `pi list` to verify the package is registered.
</Checks>

<Report_Format>
```
## oh-my-awesome-agent Doctor Report

**Summary:** HEALTHY / ISSUES FOUND

| Check | Status | Details |
|-------|--------|---------|
| ... | ... | ... |

### Issues Found
1. ...

### Recommended Fixes
...
```
</Report_Format>

<Auto_Fix>
If issues found, ask user: "Would you like me to fix these issues automatically?"

If yes, apply fixes based on findings:
- Missing extension file: recreate from source
- Missing package.json fields: add pi manifest
- Missing prompts/skills: create placeholders
- pi not installed: run `pi install -l .`
</Auto_Fix>

<Final_Checklist>
- [ ] Extension file exists and exports default function
- [ ] package.json has pi manifest
- [ ] Prompt templates have frontmatter and $ARGUMENTS
- [ ] Skills have SKILL.md with name/description
- [ ] TypeScript config exists
- [ ] Smoke test exists
- [ ] pi installation verified
</Final_Checklist>