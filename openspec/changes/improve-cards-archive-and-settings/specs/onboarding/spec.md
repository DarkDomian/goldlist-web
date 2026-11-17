# Spec Delta

## MODIFIED Requirements

### Requirement: Default settings confirmation

The onboarding flow SHALL present the default 14-calendar-day freeze, midnight cutoff, and current theme preference, and SHALL allow the user to confirm them before finishing. The theme preference SHALL be shown as Light, Dark, or System.

#### Scenario: Defaults are visible

- **WHEN** the user reaches the confirmation step
- **THEN** the flow shows a 14-day freeze, a 00:00 local cutoff, and the current theme as Light, Dark, or System

#### Scenario: Confirming defaults completes onboarding

- **WHEN** the user confirms the defaults
- **THEN** the app persists `onboardingCompleted = true` and navigates to the Current Day view
