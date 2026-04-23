---
name: refactor-components
description: Refactor React Native components toward slimmer responsibilities and reuse.
argument-hint: "[file-or-folder]"
disable-model-invocation: true
user-invocable: true
---

Target: $ARGUMENTS
- Use `component-reuse-refactorer`.
- Use `test-hardener` first for risky UI changes.
- Keep the work focused on slimmer components, clearer boundaries, and reuse.
- Report extracted or simplified parts, tests run, and remaining risks.
