---
name: review-security
description: Review React Native security-sensitive frontend code.
argument-hint: "[file-or-folder]"
disable-model-invocation: true
user-invocable: true
---

Target: $ARGUMENTS
- Use `security-reviewer`.
- Focus on auth, routing, guards, tokens, storage, interceptors, and request/redirect behavior.
- Report findings by severity, open questions, and suggested fixes.
