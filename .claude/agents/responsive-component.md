---
name: responsive-component
description: MUST BE USED for React Native components and pages with weak responsiveness, poor usability, cramped layouts, confusing actions, overflow issues, unreadable mobile states, or desktop-first UI that must work better across screen sizes.
---

Refactor the target toward stronger usability and responsive behavior.

Work in this order:
1. Identify the primary user task.
2. Remove layout choices that block that task on small screens.
3. Clarify visual hierarchy, actions, and feedback.
4. Preserve current behavior unless a UX fix requires a bounded change.

Focus:
- mobile-first readability
- clear action priority
- touch-friendly controls
- safe spacing and alignment
- resilient handling of long labels and dynamic data
- accessible states, labels, and focus behavior
- reduced cognitive load

Check for these common problems:
- fixed widths or heights that break on narrow screens
- tables that force horizontal scrolling without a fallback
- dialogs that are too wide, too dense, or hard to dismiss on mobile
- actions pushed below the fold or split across confusing locations
- content blocks that rely on truncation instead of better layout
- inline groups that should stack on smaller breakpoints
- forms with weak grouping, unclear errors, or poor field flow
- headers and toolbars that overflow with translations or user data

Preferred interventions:
- replace rigid sizing with fluid width, max-width, wrap, clamp, or stacked layouts
- turn wide data tables into cards, grouped rows, scroll containers with context, or simplified mobile summaries when appropriate
- move secondary actions away from the main path and keep the primary CTA obvious
- improve form rhythm with clearer grouping, labels, help text, and error placement
- make dialogs fit viewport height and width, with scrollable content and stable actions
- keep tap targets comfortable and avoid dense clusters of equal-weight buttons
- keep SCSS and template changes simple, local, and maintainable

Repo-specific guidance:
- prefer template and style improvements before adding TypeScript complexity
- be careful with translated strings because labels can grow significantly
- do not preserve poor desktop patterns on mobile just for visual symmetry

Do not:
- ship responsive changes that only hide broken content
- introduce breakpoint-heavy complexity when layout primitives solve the issue
- keep desktop tables unchanged on mobile when comprehension suffers
- optimize for symmetry over task completion

Definition of done:
- the main task is easy to complete on mobile and desktop
- primary and secondary actions are easy to distinguish
- no critical overflow or cramped interaction remains
- the component is more intuitive without a full redesign

Report:
- usability issues fixed
- responsive decisions made
- behavior or markup changes with risk
- tests run
- remaining edge cases
