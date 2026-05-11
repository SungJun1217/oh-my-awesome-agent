---
name: awesome-workflow
description: Lightweight pi-native end-to-end coding workflow with Ralph-loop discipline. Use for autonomous implementation, planning, self-review, and verification without heavy multi-agent infrastructure.
---

<Purpose>
Provide general operating discipline for end-to-end coding tasks in pi.
</Purpose>

<Use_When>
- User asks to finish a task end-to-end.
- Task is broad but implementation-oriented.
- Agent seems likely to stop at planning.
- User invokes `/ultrawork`, `/finish`, or `/review`.
</Use_When>

<Do_Not_Use_When>
- Task is pure research with no repo action.
- Task requires external credentials the agent does not have.
- User explicitly asked for plan-only output.
</Do_Not_Use_When>

<Principles>
- Stay pi-native: use `read`, `edit`, `write`, and `bash` directly.
- Prefer minimal context and focused file reads.
- Do not create heavy background processes unless explicitly requested.
- Keep visible plans short and actionable.
- Always close the loop with verification or a clear reason verification was skipped.
- Evidence before action: do not edit before locating relevant code and patterns.
- Bounded autonomy: continue only while progress is visible and the next step is safe.
- No silent scope expansion: if the task grows beyond original scope, stop and explain options.
- Honest state over optimistic state: if verification failed, say so.
</Principles>

<Default_Loop>
1. **IntentGate**: infer the real outcome, constraints, and unknowns. Ask only if blocked.
2. **Scout**: inspect relevant files, configs, tests, and project conventions.
3. **Plan**: concise todo list with verification strategy.
4. **Build**: implement the smallest correct change.
5. **Review**: check edge cases, security, duplicated logic, and style.
6. **Verify**: run targeted tests/typecheck/lint/build.
7. **Report**: summarize changed files, checks, and remaining risks.
</Default_Loop>

<Modes>
- **ultrawork**: execute the full Ralph loop end-to-end.
- **hyperplan**: plan and critique only; no edits.
- **scout**: repository reconnaissance only; return compact findings.
- **review**: inspect changes; do not edit unless fix mode is requested.
- **finish**: close the loop with review, safe fixes, verification, and a truth-state report.
</Modes>

<Truth_States>
End edit-capable work with one state:
- `finished`: no known related blockers remain.
- `finished-with-notes`: task is done, but unrelated/pre-existing failures or non-blocking risks remain.
- `blocked`: user decision, risky action, missing credential, or unclear requirement prevents safe completion.
- `partial`: useful progress was made, but budget/environment prevented full verification or completion.

Never claim `finished` if known task-related checks still fail.
</Truth_States>

<Loop_Budgets>
Default conceptual budget:
- maxIterations: 5
- maxVerificationRetries: 3
- stopOnRepeatedFailure: true
- requireProgressEachIteration: true
</Loop_Budgets>

<Safe_Continuation_Rules>
The agent may continue autonomously when all are true:
- the failure is related to the current task
- the next fix is scoped and reversible
- no protected path or destructive operation is required
- no product decision is needed
- there is evidence the previous iteration made progress

Otherwise, stop and report `blocked` or `partial`.
</Safe_Continuation_Rules>

<Context_Strategy>
Preferred context order:
1. explicit files mentioned by user
2. project instructions (`AGENTS.md`, package docs already loaded by pi)
3. manifests and scripts
4. relevant source files
5. relevant tests
6. related call sites
7. broader search only if needed
</Context_Strategy>

<Edit_Strategy>
- use `edit` for existing text replacement
- use `write` only for new files or full rewrites that are clearly safer
- avoid formatting unrelated files
- avoid broad mechanical rewrites without confirmation
- preserve public APIs unless task requires changing them
</Edit_Strategy>

<Verification_Strategy>
Verification command selection:
1. If a specific test file changed, run that test.
2. If package scripts exist, prefer the narrowest relevant script.
3. If TypeScript changed, run typecheck if available.
4. If config/build changed, run config parser/build smoke check.
5. If docs only changed, no test required unless docs generation exists.

The final report must distinguish:
- passed checks
- failed checks fixed
- failed checks still failing
- checks skipped
</Verification_Strategy>

<Recovery_Strategy>
When something fails:
failure → inspect error → decide related/unrelated → fix or report → rerun focused check

Fix related failures within scope. Do not expand into unrelated refactors.
</Recovery_Strategy>

<Completion_Definition>
A task is complete when all are true:
- requested behavior is implemented or blocker is explained
- relevant files were reviewed after edit
- reasonable verification was attempted
- final report includes changed files and checks
</Completion_Definition>

<Final_Checklist>
- [ ] IntentGate completed; real goal and constraints understood
- [ ] Scout gathered enough evidence before editing
- [ ] Plan is concise and includes verification strategy
- [ ] Build made the smallest correct change
- [ ] Review found no unaddressed blockers
- [ ] Verify was attempted with results reported
- [ ] Truth state is honest (not optimistic)
- [ ] Remaining risks or follow-ups are noted
</Final_Checklist>