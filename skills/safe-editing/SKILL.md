---
name: safe-editing
description: Careful editing workflow for precise edits, multi-file refactors, risky files, generated files, configs, CI, migrations, and protected paths. Use before or during risky code changes.
---

<Purpose>
Guide careful editing, especially multi-file or risky changes.
</Purpose>

<Use_When>
- Refactoring.
- Touching configs/CI/migrations.
- Editing many files.
- Modifying risky areas like auth, payments, or secrets.
- User invokes `/finish` after review findings.
</Use_When>

<Do_Not_Use_When>
- Task is trivial one-line fix; use normal `/ultrawork`.
- Task requires only reading; use `/scout`.
</Do_Not_Use_When>

<Principles>
- Understand relevant code and patterns before editing.
- Prefer precise `edit` replacements for existing files.
- Use `write` for new files or when a full rewrite is clearly safer.
- Avoid unrelated formatting or cleanup.
- Keep public APIs stable unless the task requires changing them.
- Verify after edits.
</Principles>

<Multi_File_Changes>
1. Identify all affected files first.
2. Make the smallest coherent change set.
3. Update tests/docs only when tied to the task.
4. Run focused verification.
5. Self-review the diff.
</Multi_File_Changes>

<Ask_Before>
- deleting files
- broad renames/refactors
- changing lockfiles
- updating snapshots
- editing generated files
- editing `.env*`, secrets, keys, or credentials
- changing migrations or schema/data behavior
- changing CI/deploy config
- staging, committing, pushing, or tagging
</Ask_Before>

<Generated_Files>
If a file appears generated (`dist/`, `build/`, `coverage/`, `generated/`, `.next/`, `target/`, or "do not edit" headers), prefer editing the source or generator.
</Generated_Files>

<Final_Check>
Before reporting success, confirm:
- changed files match the task scope
- no obvious unrelated edits were made
- relevant checks were run or skipped with reason
- remaining risk is reported honestly
</Final_Check>

<Final_Checklist>
- [ ] All affected files identified before editing
- [ ] Edit strategy chosen (edit vs write)
- [ ] No unrelated formatting
- [ ] Public APIs preserved unless required
- [ ] Verification run after edits
- [ ] Generated files avoided or handled correctly
- [ ] Remaining risk reported honestly
</Final_Checklist>