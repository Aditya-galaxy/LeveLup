# LevelUp — Product Requirements (current build)

## Summary
LevelUp is a gamified, dark-premium iOS-first fitness/habits app built with
Expo + FastAPI. The user "awakens" via onboarding, is assigned a rank (E–S),
completes daily missions that grant XP, builds streaks and stats, and unlocks
AI-driven Pro features (food scan, plan generation).

## Stack
- **Frontend**: Expo Router (SDK 54), React Native, AsyncStorage,
  expo-image-picker, expo-haptics. Single accent `#534AB7` over near-black.
- **Backend**: FastAPI + MongoDB (Motor). emergentintegrations + GPT-4o via
  Emergent Universal LLM key for AI Food Scan and AI Plan Generation.
- **Auth**: none — local profile only (per spec).
- **Subscriptions**: RevenueCat-ready paywall UI; backend gates premium via
  `x-app-user-id` header (preview value `pro`).

## Implemented features
- 8-step onboarding (tone, goal, movement literacy, equipment, schedule,
  body stats, nutrition baseline, rank reveal).
- 5 bottom tabs: Home, Missions, Log, Analytics, Profile.
- Domain logic: ranks E–S w/ multipliers (1.0–2.5), sub-levels 1–10 per rank
  (~15% harder each), streak bonus (+10% @ 7d, +20% @ 30d), miss penalty
  (-25/-50/-75 XP), Penalty Zone (0.5x after 3 misses, 5-completion recovery),
  Aura (+1 per primary mission, never decreases), 6 stats 0–100.
- Missions: daily / weekly / custom (custom is Pro-gated, shows paywall).
- Log: macro rings (calories, protein, water), quick water adds, meal logging,
  4 habit toggles, 30-day history strip.
- Analytics: XP-per-day chart, stat bars, completion rate, alert history.
- Profile: avatar, rank/level/Aura/longest streak, achievements grid (7),
  plan regenerate (free/Pro), Pro toggle, legal links, reset all data.
- AI Food Scan (Pro): camera/library → backend GPT-4o → estimate → edit →
  confirm log. Free user opens paywall.
- AI Plan Generation (Pro): equipment-aware validated plan; falls back to
  deterministic plan if AI output is invalid (e.g., barbell on bodyweight).
- System Alerts: rule-based (Penalty Zone trigger); banner on Home + history
  in Analytics.
- Paywall: $4.99/mo · $39.99/yr with 7-day trial · restore purchases ·
  legal disclosure. Subscriptions auto-renew copy included.

## Backend endpoints
- `GET /api/health` `{status, timestamp, version}`
- `GET /api/ready` Mongo ping
- `GET /api/config` ranks, multipliers, products, AI model id, disclaimers
- `POST /api/nutrition/analyze-image` (multipart, Pro) → NutritionEstimate
- `POST /api/plans/generate` (json, Pro) → `{plan, source: ai|fallback}`

All premium calls return `402 { detail: { code: "premium_required" } }` when
the header is missing/invalid.

## Tests
- 7 Python tests in `/app/tests/test_levelup.py` (health, config, premium gate
  on both AI endpoints, deterministic plan correctness, equipment-safety
  validator rejecting barbell on bodyweight-only).
- Backend integration: 10/10 passed via testing_agent on the live URL.

## Known limits / out of scope (this iteration)
- Push notifications: not implemented (Expo Go limitation; future native build).
- RevenueCat live IAP: paywall UI only; real purchases require iOS build.
- Backend persistence: AI results are not stored (privacy stance, per spec).
