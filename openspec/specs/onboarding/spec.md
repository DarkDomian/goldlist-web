# onboarding Specification

## Purpose
Introduces the GoldList method on first launch and confirms the fixed Russian-to-English learning setup before the user starts adding cards.

## Requirements

### Requirement: First-launch detection

The app SHALL route a user with `onboardingCompleted = false` to the onboarding flow and a user with `onboardingCompleted = true` to the Current Day view.

#### Scenario: New user sees onboarding

- **WHEN** the app starts and `onboardingCompleted` is `false`
- **THEN** the onboarding flow is shown before any other screen

#### Scenario: Returning user skips onboarding

- **WHEN** the app starts and `onboardingCompleted` is `true`
- **THEN** the app opens the Current Day view without showing onboarding

### Requirement: Preset language pair

The onboarding flow SHALL display Russian as the native language and English as the target language, and SHALL NOT offer language selection or language editing.

#### Scenario: Language pair is shown read-only

- **WHEN** the user views onboarding
- **THEN** Russian is shown as native and English as target with no controls to change either value

#### Scenario: No language selection step

- **WHEN** the user moves through onboarding
- **THEN** no step asks the user to choose a language

### Requirement: Default settings confirmation

The onboarding flow SHALL present the default 14-calendar-day freeze, midnight cutoff, and theme, and SHALL allow the user to confirm them before finishing.

#### Scenario: Defaults are visible

- **WHEN** the user reaches the confirmation step
- **THEN** the flow shows a 14-day freeze, a 00:00 local cutoff, and the current theme

#### Scenario: Confirming defaults completes onboarding

- **WHEN** the user confirms the defaults
- **THEN** the app persists `onboardingCompleted = true` and navigates to the Current Day view

### Requirement: One-time intro

After onboarding is completed, the app SHALL NOT show the intro again during normal use.

#### Scenario: Intro does not repeat

- **WHEN** a user who completed onboarding starts the app again
- **THEN** the intro is not shown and Current Day is displayed

### Requirement: GoldList method explanation

The onboarding flow SHALL briefly explain the add, rest, distill, and learn-or-let-go cycle before the user adds a first card.

#### Scenario: Method is explained

- **WHEN** the user starts onboarding
- **THEN** a short explanation of the GoldList method is shown before the confirmation step
