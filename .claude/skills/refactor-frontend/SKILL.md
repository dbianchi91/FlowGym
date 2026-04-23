---
name: refactor-frontend
description: Staged React frontend refactor with bounded batches and regression controls.
argument-hint: "[file-or-folder]"
disable-model-invocation: true
user-invocable: true
---

Target: $ARGUMENTS
Default target: `src`

1. Use `frontend-refactor-orchestrator`.
2. Execute one safe batch at a time with:
   - `service-refactorer`
   - `component-reuse-refactorer`
   - `test-hardener`
   - `security-reviewer`
   - `vulnerabilities`
3. Ask only for high-risk or behavior-changing decisions.
4. After each batch report:
   - files changed
   - tests run
   - residual risks
   - next batch
