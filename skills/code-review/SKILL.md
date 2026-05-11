---
name: code-review
description: High-signal code review workflow for diffs, staged changes, target files, security-sensitive code, and test coverage gaps. Use when reviewing code or preparing PR feedback.
---

<Purpose>
Guide high-signal reviews that find meaningful issues without generic checklist spam.
</Purpose>

<Use_When>
- Reviewing a diff or staged changes.
- Reviewing security-sensitive code.
- Preparing PR feedback.
- User invokes `/review`.
</Use_When>

<Do_Not_Use_When>
- Task requires implementation; use `/ultrawork`.
- Task requires exploration; use `/scout`.
- Task requires planning; use `/hyperplan`.
</Do_Not_Use_When>

<Severity>
- **blocker**: likely bug, security issue, data loss, broken build/test.
- **major**: important correctness, maintainability, or regression risk.
- **minor**: useful but not release-blocking.
- **nit**: optional style/readability; use sparingly.

If no blocker or major issues are found, say so clearly.
</Severity>

<Checklist>
**Correctness**:
- edge cases
- error handling
- async/concurrency behavior
- null/undefined handling
- state consistency
- API compatibility

**Security**:
- auth/authz boundaries
- injection risks
- path traversal
- secret handling
- unsafe shell execution
- SSRF/network side effects
- dependency or supply-chain risk

**Tests**:
- changed behavior covered
- failure paths covered
- snapshots intentional
- tests deterministic
- mocks not hiding behavior

**Maintainability**:
- follows existing patterns
- names clarify intent
- complexity justified
- duplication acceptable or reduced
- public interface changes documented

**Operations**:
- config defaults safe
- logs avoid secrets
- migrations reversible
- performance implications understood
</Checklist>

<Review_Philosophy>
Prioritize findings by impact.

Prefer:
- concrete bugs over style preferences
- reproducible issues over speculation
- security and data loss risks over minor cleanup
- test gaps that could hide real regressions
- project conventions over personal taste

Avoid:
- generic checklist spam
- nitpicks unless explicitly requested
- demanding unrelated refactors
- repeating obvious facts from the diff
- claiming certainty without evidence
</Review_Philosophy>

<Output>
For each finding include:
- severity
- path/line when available
- evidence
- impact
- suggested fix

If no blocker or major issues are found, say so clearly.
Do not invent line numbers.
</Output>

<Final_Checklist>
- [ ] Scope is defined
- [ ] Correctness checked
- [ ] Security checked
- [ ] Tests checked
- [ ] Maintainability checked
- [ ] Operations checked
- [ ] Findings include severity and evidence
- [ ] Overall verdict is clear
</Final_Checklist>