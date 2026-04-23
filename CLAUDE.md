# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start Expo dev server (scan QR with Expo Go)
npm run android    # Start on Android emulator/device
npm run ios        # Start on iOS simulator
npm run build:apk  # EAS cloud build for Android APK (preview profile)
npm run build:apk:local  # EAS local build for Android APK
```

There is no lint script and no test suite configured.

TypeScript errors are logged in `ts_errors.txt` for reference; use `npx tsc --noEmit` to check types.

## Architecture

FlowGym is a **fully offline** React Native / Expo wellness app. There is no backend. All data lives in a local SQLite database (`expo-sqlite`). The "AI" is purely local template selection.

### Entry & Initialization

`App.tsx` initializes the SQLite database and daily notification before rendering. It shows a loading spinner until `initDatabase()` resolves.

### Navigation (two-level)

`src/navigation/AppNavigator.tsx`:
- Root Stack checks `AsyncStorage` for `hasCompletedOnboarding` on mount to decide the initial screen.
- **Root Stack screens**: `Onboarding`, `MainTabs`, `CheckInFlow` (modal), `SkillScreen`
- **MainTabs** (bottom tabs): `Home`, `Activities`, `GoalHistory`, `History`

### Database (`src/data/database.ts`)

Single SQLite file (`flowgym.db`). Tables:
- `CheckIns` — daily user self-assessment (energy, mood, focus, sleep, drive on 1–5)
- `UserHistory` — record of each skill shown/completed
- `Goals` — short/mid/long-term goals with progress tracking
- `GoalLogs` — journal notes attached to goals
- `UserProfile` — singleton row (id=1): level, xp, name, birth_year, streak_target
- `SkillStats` — bandit statistics per skill (shown, completed, skipped, postponed, avg_rating)
- `AiMessageLog` — log of contextual messages shown

**Migration pattern**: New columns are added via `ALTER TABLE` inside a `try/catch` loop in `initDatabase()`. This means schema changes must always be additive — never drop or rename columns.

XP leveling formula: `level = floor(sqrt(xp / 50)) + 1`

### Skill Selection (`src/utils/ruleEngine.ts`)

Uses a **Thompson Sampling multi-armed bandit** to recommend a skill after check-in:
1. Finds the user's lowest-scoring metric (energy/mood/focus/sleep/drive).
2. Maps that metric to a skill category (`Movimento`, `Mente`, `Produttività`).
3. Samples a Beta distribution per candidate skill using its historical completion/skip stats.
4. Applies strong recency penalties (×0.1 if done yesterday, ×0.4 if done in last 3 days).

Skills are defined in `src/data/skills.json` and `src/data/extra_skills.json` as static JSON arrays with shape `{ id, title, category, description, duration_minutes, steps }`.

### AI Messaging (`src/services/aiService.ts`)

Selects tone (`gentle | coach | energetic | calm | balanced | empathic`) from check-in context and time of day, then resolves i18n keys of the form `ai.<tone>.<timeSlot>.<variant>.{title|message|ctaLabel}`. No network calls; all messages are in the translation files.

### Internationalization (`src/i18n/`)

Supported languages: `it` (default/fallback), `en`, `fr`, `es`, `de`. Language preference is persisted in `AsyncStorage` under key `user_language`. Device locale is used for first-run detection.

All user-facing strings must be added to **all five** translation files (`src/i18n/{it,en,fr,es,de}.json`).

### Theme (`src/theme/colors.ts`)

Dark theme only. Import `colors` and `theme` (spacing + borderRadius) from here. Do not hardcode color hex values inline.

### Persistent State Conventions

- **SQLite** — primary data store (check-ins, goals, history, profile)
- **AsyncStorage** — lightweight flags: `hasCompletedOnboarding`, `user_language`, `pendingSkill` (temporary skill object between CheckIn and SkillScreen)
- **No Redux / Context API** — screens fetch data directly from DB on focus using `useIsFocused()`

### Build & Distribution

EAS Build config is in `eas.json`. Android package: `com.flowgym.app`. EAS project owner: `ilwaissen`.
