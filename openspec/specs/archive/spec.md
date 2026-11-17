# archive Specification

## Purpose
Presents learned, unlearned, and waiting cards in ordered blocks and provides the re-learn and delete actions for archived cards.

## Requirements

### Requirement: Ordered archive blocks

The Archive SHALL be a single view that presents cards in three ordered blocks: learned first, unlearned second, and waiting third.

#### Scenario: Block order is fixed

- **WHEN** the user opens the Archive
- **THEN** learned, unlearned, and waiting blocks appear in that order

#### Scenario: Blocks are not switched

- **WHEN** the user views the Archive
- **THEN** all non-empty blocks are available on the same view without a block switcher

### Requirement: Learned block content

The learned block SHALL render each card as a compact bordered chip showing only its English word, with multiple chips per row when space allows. The Archive list SHALL NOT show the translation or examples; the detail view SHALL keep the translation hidden and MAY show examples.

#### Scenario: Learned card hides translation

- **WHEN** a learned card is shown in the Archive list
- **THEN** its English word is visible and its translation and examples are not shown in the list

#### Scenario: Multiple chips share a row

- **WHEN** several learned cards are shown on a wide enough viewport
- **THEN** multiple bordered chips appear on the same row

#### Scenario: Learned detail hides translation

- **WHEN** the user opens a learned card's detail view
- **THEN** the Russian translation remains hidden

### Requirement: Unlearned block content

The unlearned block SHALL render each card as a compact bordered chip showing only its English word, with multiple chips per row when space allows. The Russian translation and examples SHALL remain available in the card detail view.

#### Scenario: Unlearned chip shows only the word

- **WHEN** an unlearned card is shown in the Archive list
- **THEN** its English word is visible and its translation and examples are not shown in the list

#### Scenario: Unlearned card shows translation

- **WHEN** the user opens an unlearned card's detail view
- **THEN** its Russian translation and examples are available

### Requirement: Waiting block content

The waiting block SHALL render each card as a compact metallic-gradient chip that displays its copper, silver, or gold status and SHALL NOT show the word, translation, or examples.

#### Scenario: Waiting card is contentless

- **WHEN** a waiting card is shown in the Archive
- **THEN** the chip shows its copper, silver, or gold status and no word, translation, or examples

#### Scenario: Waiting status colors differ

- **WHEN** waiting cards of different statuses are shown
- **THEN** each chip uses a distinct metallic gradient for its copper, silver, or gold status

#### Scenario: Waiting cards are not blurred

- **WHEN** waiting cards are shown in the Archive
- **THEN** their status presentation remains crisp rather than blurred

### Requirement: Empty blocks are hidden

The Archive SHALL not render a block that contains no cards.

#### Scenario: Missing block is omitted

- **WHEN** there are no unlearned cards
- **THEN** the unlearned block is not rendered

#### Scenario: Fully empty archive

- **WHEN** the Archive contains no cards in any block
- **THEN** an empty state is shown

### Requirement: Re-learn action

The Archive SHALL offer Re-learn only in the detail view of learned and unlearned cards. Activating it SHALL return the card to `copper` in Current Day with a null scheduled date while preserving examples and attempt history.

#### Scenario: Re-learn from learned block

- **WHEN** the user chooses Re-learn on a learned card's detail view
- **THEN** the card becomes copper with no scheduled date and appears in Current Day

#### Scenario: Re-learn from unlearned block

- **WHEN** the user chooses Re-learn on an unlearned card's detail view
- **THEN** the card becomes copper with no scheduled date and appears in Current Day

#### Scenario: Active cards have no Re-learn action

- **WHEN** the user opens a copper, silver, or gold card's detail view
- **THEN** no Re-learn action is shown

#### Scenario: Re-learn preserves history

- **WHEN** a card is re-learned
- **THEN** its examples and prior distillation attempts remain stored

### Requirement: Archived card deletion

The Archive SHALL offer deletion of learned and unlearned cards through the card detail view and SHALL require confirmation before permanent removal.

#### Scenario: Delete an archived card

- **WHEN** the user confirms deletion from an archived card's detail view
- **THEN** the card is permanently removed from the Archive

#### Scenario: Delete requires confirmation

- **WHEN** the user chooses to delete an archived card
- **THEN** a confirmation dialog appears before anything is removed

### Requirement: Archive ordering within blocks

The system SHALL order learned and unlearned cards by most recently changed first and waiting cards by soonest due date first.

#### Scenario: Newly archived card appears first

- **WHEN** a learned card is added to the learned block
- **THEN** it appears before older learned cards

#### Scenario: Soonest due waiting card appears first

- **WHEN** waiting cards have different due dates
- **THEN** the card with the earliest `scheduledFor` is listed first
