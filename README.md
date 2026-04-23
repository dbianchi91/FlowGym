# FlowGym

FlowGym is an offline-first React Native app that helps users build better daily habits through check-ins, personalized micro-skills, goal tracking, and lightweight gamification.

This repository is public because it represents how I design and ship real mobile product features end-to-end: UX, data model, business logic, and app architecture.

## Why I Built It

Most wellness apps are either generic or too heavy to use every day.  
FlowGym focuses on a simple loop:

1. daily check-in (energy, mood, focus, sleep, drive)
2. personalized suggested micro-action
3. measurable progress with XP, levels, streak, and goals

The objective is consistent behavior change, not just data collection.

## Core Features

- Offline-first local persistence with SQLite (`expo-sqlite`)
- Daily check-in flow with 5-dimension scoring
- Personalized micro-skill suggestion engine (rule engine + Thompson Sampling)
- Goal system with short/mid/long horizon, progress and completion states
- RPG-lite progression (XP + level curve)
- Adaptive daily notifications (morning, lunch, evening, plus missing-check-in reminder)
- Weekly trend insights and chart visualization
- Multi-language support (`it`, `en`, `fr`, `es`, `de`)
- Onboarding and persisted app state with AsyncStorage

## Tech Stack

- React Native + Expo
- TypeScript
- React Navigation (native stack + tabs)
- SQLite (local relational storage)
- i18next + react-i18next
- Expo Notifications

## Architecture Notes

Project structure (high level):

```text
src/
  components/     reusable UI and modal system
  screens/        feature screens (Home, CheckIn, Activities, Skill, History, Goals)
  data/           SQLite schema, migrations, and query layer
  services/       notifications + contextual messaging logic
  utils/          rule engine and insights generation
  i18n/           localization resources and language detection
  navigation/     app navigation flow
```

Key implementation choices:

- **Offline-first by default:** critical user data stays on device.
- **Safe schema evolution:** startup runs idempotent migrations for existing installations.
- **Behavior-aware recommendation:** skill selection balances relevance and variety through penalties + probabilistic scoring.
- **Bounded complexity:** logic is separated across `data`, `services`, and `utils` to keep screens focused on UI behavior.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Expo CLI / Expo Go (for device testing)

### Install and run

```bash
npm install
npm run start
```

Then open on:

- Android emulator / device: `npm run android`
- iOS simulator / device (macOS): `npm run ios`
- Web preview: `npm run web`

### Build APK (EAS)

```bash
npm run build:apk
```

Local EAS preview build:

```bash
npm run build:apk:local
```

## Product Highlights for Recruiters

- Designed a complete engagement loop from data collection to action recommendation
- Implemented local-first data architecture with migration safety
- Built recommendation and insight logic without backend dependency
- Added internationalization and notification personalization
- Translated product goals into technical modules that are easy to extend

## AI-Assisted Engineering Workflow

During development, I use Claude Code with custom agents and skills to optimize delivery speed and code quality.

- Structured refactor orchestration (component/service/frontend scopes)
- Security-focused review agents for auth, routing, storage, and request flows
- Test-hardening workflows around risky changes
- Reusable skill definitions to standardize implementation and review patterns

## Privacy

FlowGym is currently designed to keep primary user data on-device (SQLite + local storage).  
No remote analytics pipeline is required for core functionality.

## Current Limitations

- No backend sync yet (single-device data only)
- Automated test coverage is still limited
- Recommendation engine is heuristic/probabilistic and can be further validated with larger real-world datasets

## Roadmap

- Add automated unit/integration tests for rule engine and data layer
- Introduce optional cloud sync and account system
- Improve recommendation quality with richer contextual signals
- Add accessibility refinements and UX polish for edge cases

## Repository Status

Active personal project, continuously improved in small production-style iterations.



