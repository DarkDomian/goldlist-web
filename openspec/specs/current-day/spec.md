# current-day Specification

## Purpose
Shows the cards added today before the daily cutoff and provides the primary entry point for adding new words.

## Requirements

### Requirement: Current Day contents

The Current Day view SHALL show only cards whose status is `copper` and whose `scheduledFor` is null.

#### Scenario: Newly added cards appear

- **WHEN** a card is created
- **THEN** it appears in the Current Day view

#### Scenario: Waiting and archived cards are excluded

- **WHEN** a card has a non-null `scheduledFor` or an archived status
- **THEN** it is not shown in Current Day

### Requirement: Default post-onboarding destination

The app SHALL use `/` or `/today` as the Current Day route and SHALL open it after onboarding is completed.

#### Scenario: Root route shows Current Day

- **WHEN** the user opens the app root after onboarding
- **THEN** the Current Day view is displayed

### Requirement: Card-shaped add action

The Current Day view SHALL provide a card-shaped add button with a plus sign at the top of the list, and activating it SHALL open the Add Card flow.

#### Scenario: Add action is at the top

- **WHEN** the user opens Current Day
- **THEN** the add button appears as a card with a plus sign above the existing cards

#### Scenario: Add action opens the form

- **WHEN** the user activates the add button
- **THEN** the Add Card input is shown

### Requirement: Current Day empty state

The Current Day view SHALL show an empty state when no cards are present while keeping the add action available.

#### Scenario: Empty day

- **WHEN** the user opens Current Day with no cards
- **THEN** an empty state is shown and the add button remains available

### Requirement: Card summary layout

The Current Day view SHALL render full-width cards with the status shown as a colored circle in the top-right corner, the English word aligned to the left, the Russian translation below it, and English examples following.

#### Scenario: Card content order

- **WHEN** a Current Day card is displayed
- **THEN** the word, translation, and examples appear in that order with the status circle in the top-right

#### Scenario: Cards use full width

- **WHEN** the Current Day list is displayed on a mobile viewport
- **THEN** each card spans the available width

### Requirement: Immediate visibility of new cards

The system SHALL show a newly created card in Current Day without requiring a page reload.

#### Scenario: Card appears after creation

- **WHEN** card creation succeeds
- **THEN** the new card is visible in Current Day immediately

### Requirement: Cutoff transition

The system SHALL remove a card from Current Day when the daily cutoff schedules it as a waiting card.

#### Scenario: Card leaves at cutoff

- **WHEN** the daily cutoff processes a Current Day card
- **THEN** the card no longer appears in Current Day
