---
name: repo-scout
description: Efficient repository exploration strategy for finding files, mapping features, tracing errors, locating tests, and identifying safe next steps without editing. Use for /scout-style reconnaissance.
---

<Purpose>
Guide efficient codebase exploration before planning or editing.
</Purpose>

<Use_When>
- User asks where something lives.
- Repo is unfamiliar.
- Task scope is unclear.
- `/scout` needs deeper exploration guidance.
</Use_When>

<Do_Not_Use_When>
- Task requires immediate implementation; use `/ultrawork`.
- Task requires full architecture design; use `/hyperplan`.
</Do_Not_Use_When>

<Depth>
- **quick**: specific file, symbol, or error; inspect about 1-5 files.
- **normal**: feature or subsystem; inspect key source files and tests.
- **deep**: unfamiliar repo or architecture; inspect manifests, structure, entry points, flows, and risks.
</Depth>

<Strategies>
If given a path:
1. Read the file.
2. Inspect imports/exports/callers if useful.
3. Find nearby tests and related modules.

If given an error:
1. Search exact text.
2. Search related symbols.
3. Inspect stack trace files.
4. Identify likely failing test/runtime path.

If given a feature:
1. Search feature terms.
2. Inspect routes/components/services/models/configs.
3. Identify data flow and boundaries.
4. Identify tests or missing tests.

If asked for overview:
1. Inspect top-level files and manifests.
2. Summarize structure and entry points.
3. Identify test/build commands.
4. Identify project instructions.
</Strategies>

<Context_Budget>
Soft budget by depth:
- quick: up to 5 files
- normal: up to 12 files
- deep: up to 25 files

The agent may exceed this if the repository is small or the question requires it, but should say when it is expanding scope.
</Context_Budget>

<Output>
Return:
- relevant files with reasoning
- key patterns
- likely edit points
- tests/verification
- risks/unknowns
- suggested next step (`/hyperplan` or `/ultrawork`)

Do not edit files.
Do not produce a full implementation plan unless the user asks.
</Output>

<Final_Checklist>
- [ ] Question is restated clearly
- [ ] Depth was chosen intentionally
- [ ] Exploration strategy matches input type
- [ ] Context budget was respected or expansion noted
- [ ] Relevant files are identified with evidence
- [ ] Tests/verification path is noted
- [ ] Risks/unknowns are called out
- [ ] Next step is recommended
</Final_Checklist>