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

The learned block SHALL show each card's English word and English examples only, and SHALL NOT show its Russian translation.

#### Scenario: Learned card hides translation

- **WHEN** a learned card is shown in the Archive
- **THEN** its English word and examples are visible and its Russian translation is not

#### Scenario: Learned detail hides translation

- **WHEN** the user opens a learned card's detail view
- **THEN** the Russian translation remains hidden

### Requirement: Unlearned block content

The unlearned block SHALL show each card's English word, Russian translation, and English examples.

#### Scenario: Unlearned card shows translation

- **WHEN** an unlearned card is shown in the Archive
- **THEN** its English word, Russian translation, and examples are visible

### Requirement: Waiting block content

The waiting block SHALL show each card as a standardized empty card colored by its status (copper, silver, or gold), with no words or examples.

#### Scenario: Waiting card is contentless

- **WHEN** a waiting card is shown in the Archive
- **THEN** the card shows only its status color and no word, translation, or examples

#### Scenario: Waiting status colors differ

- **WHEN** waiting cards of different statuses are shown
- **THEN** each card uses the color for its copper, silver, or gold status

### Requirement: Empty blocks are hidden

The Archive SHALL not render a block that contains no cards.

#### Scenario: Missing block is omitted

- **WHEN** there are no unlearned cards
- **THEN** the unlearned block is not rendered

#### Scenario: Fully empty archive

- **WHEN** the Archive contains no cards in any block
- **THEN** an empty state is shown

### Requirement: Re-learn action

The Archive SHALL offer a Re-learn action on learned and unlearned cards that returns the card to `copper` in Current Day.

#### Scenario: Re-learn from learned block

- **WHEN** the user chooses Re-learn on a learned card
- **THEN** the card becomes copper with no scheduled date and appears in Current Day

#### Scenario: Re-learn from unlearned block

- **WHEN** the user chooses Re-learn on an unlearned card
- **THEN** the card becomes copper with no scheduled date and appears in Current Day

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
