# Spec Delta

## MODIFIED Requirements

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
