---
name: harden-tests
description: Strengthen React Native tests around risky code.
argument-hint: "[file-or-folder]"
disable-model-invocation: true
user-invocable: true
---

Target: $ARGUMENTS
- Use `test-hardener`.
- Lock current behavior and improve regression protection.
- Report covered behavior, files changed, and tests run.
