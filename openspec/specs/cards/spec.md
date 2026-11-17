# cards Specification

## Purpose
Defines the vocabulary card entity and the lifecycle operations that create, protect, restore, and permanently remove cards.

## Requirements

### Requirement: Card creation

The system SHALL create a card with a unique identifier, the English word or phrase, a Russian translation, examples, a status of `copper`, a creation timestamp, a status-change timestamp, a null `scheduledFor`, and an empty distillation history.

#### Scenario: New card starts as copper

- **WHEN** the user submits a valid new English word
- **THEN** a card is created with status `copper`, `scheduledFor` null, and an empty distillation history

#### Scenario: Card records timestamps

- **WHEN** a card is created
- **THEN** `createdAt` and `statusChangedAt` are set to the creation time

### Requirement: Duplicate word blocking

The system SHALL reject a new card when the same normalized English word or phrase already exists in any status, and SHALL show the message "you already knew that".

#### Scenario: Duplicate in Current Day is rejected

- **WHEN** the user submits a word that already exists as a copper card
- **THEN** the card is not created and "you already knew that" is shown

#### Scenario: Duplicate archived word is rejected

- **WHEN** the user submits a word that already exists as learned or unlearned
- **THEN** the card is not created and "you already knew that" is shown

#### Scenario: Duplicate detection ignores case and surrounding spaces

- **WHEN** the user submits a word that differs from an existing word only by case or surrounding whitespace
- **THEN** the submission is treated as a duplicate

### Requirement: Manual translation override

The system SHALL allow the user to edit a card's Russian translation, including when automatic translation is unavailable.

#### Scenario: User edits the translation

- **WHEN** the user provides or edits the Russian translation on a card
- **THEN** the card stores the user-provided translation

#### Scenario: Card can be created without automatic translation

- **WHEN** automatic translation fails
- **THEN** the user can enter a translation manually and complete card creation

### Requirement: Re-learn an archived card

The system SHALL offer Re-learn only in the detail view of a learned or unlearned card. Activating it SHALL return the card to `copper` with `scheduledFor` null, place it in Current Day, and preserve its examples and prior distillation attempts.

#### Scenario: Re-learn moves the card to Current Day

- **WHEN** the user chooses Re-learn on a learned or unlearned card's detail view
- **THEN** the card becomes `copper` with `scheduledFor` null and appears in Current Day

#### Scenario: Re-learn preserves history

- **WHEN** a card is re-learned
- **THEN** its examples and prior distillation attempts remain stored

#### Scenario: Re-learn is not offered for active cards

- **WHEN** the user opens a copper, silver, or gold card's detail view
- **THEN** no Re-learn action is offered

### Requirement: Permanent card deletion

The system SHALL allow the user to delete a card after a confirmation dialog and SHALL remove it permanently rather than archiving it.

#### Scenario: Confirmed delete removes the card

- **WHEN** the user confirms deletion of a card
- **THEN** the card and its related examples and attempts are removed permanently

#### Scenario: Cancelled delete keeps the card

- **WHEN** the user dismisses the delete confirmation
- **THEN** the card remains unchanged

### Requirement: Card detail access

The system SHALL provide a card detail view reachable at `/card/:id` or an equivalent modal that shows the card's current allowed content and actions.

#### Scenario: Open card detail

- **WHEN** the user selects a card in Current Day or the Archive
- **THEN** the card detail view opens for that card

#### Scenario: Detail respects archive visibility rules

- **WHEN** the user opens a learned card's detail view
- **THEN** the Russian translation is not shown

### Requirement: Card normalization for matching

The system SHALL normalize card words by trimming surrounding whitespace and comparing case-insensitively when checking duplicates.

#### Scenario: Normalized comparison is used

- **WHEN** two words differ only in letter case or leading or trailing whitespace
- **THEN** the system treats them as the same word

### Requirement: Consistent card body spacing

The system SHALL preserve the standard card body padding in fixed-height preview cards and full card views, so previews keep the same internal spacing as the base card.

#### Scenario: Preview keeps the base card padding

- **WHEN** a card is rendered in preview mode
- **THEN** its body uses the same padding as a full card body
