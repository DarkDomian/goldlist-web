# Spec Delta

## ADDED Requirements

### Requirement: Manual example selection

The system SHALL provide a manual selection mode during card creation that shows a Tatoeba candidate set and lets the user choose up to three examples. The picker SHALL explain that choosing examples gives better control, and the user SHALL be able to save with fewer than three or no selected examples.

#### Scenario: Candidate list is shown

- **WHEN** manual example selection is enabled and Tatoeba returns candidates
- **THEN** card creation shows the candidates with a hint about choosing examples

#### Scenario: Only chosen examples are stored

- **WHEN** the user selects examples from the candidate list and saves the card
- **THEN** only the selected examples are stored with the card

#### Scenario: Saving without chosen examples is allowed

- **WHEN** the user saves a card without selecting any candidate
- **THEN** the card is created with no Tatoeba examples

### Requirement: User-authored examples

The system SHALL let users create, edit, and delete custom examples on a card with source `user`. Custom examples SHALL be non-empty, trimmed, and deduplicated against the card's existing examples, and SHALL be available during card creation and from card detail.

#### Scenario: User example is created

- **WHEN** the user adds a non-empty custom example
- **THEN** the example is stored with source `user` and shown on the card

#### Scenario: User example is edited or deleted

- **WHEN** the user edits or deletes a custom example
- **THEN** the stored example is updated or removed accordingly

#### Scenario: Duplicate custom example is rejected

- **WHEN** the user submits an example that matches an existing example after trimming and case normalization
- **THEN** the duplicate is not stored

#### Scenario: Archived cards remain editable

- **WHEN** the user opens a learned or unlearned card's detail view
- **THEN** custom examples can be added, edited, or deleted

## MODIFIED Requirements

### Requirement: Example fetching on card creation

The system SHALL request English example candidates for a submitted word from the Tatoeba public API. In automatic mode it SHALL attach up to three relevant candidates; in manual mode it SHALL attach only the examples the user selects.

#### Scenario: Examples are attached

- **WHEN** automatic selection is enabled and Tatoeba returns matching English sentences
- **THEN** up to three examples are stored with the card

#### Scenario: Example source is recorded

- **WHEN** a Tatoeba example is stored
- **THEN** its source is recorded as `tatoeba`

#### Scenario: Example count is capped

- **WHEN** more than three relevant candidates are available
- **THEN** no more than three Tatoeba examples are stored

### Requirement: Example caching

The system SHALL cache Tatoeba candidate sets locally so repeated lookups and offline use can reuse candidates for automatic or manual selection.

#### Scenario: Cached examples are reused

- **WHEN** the same word is looked up again and a cached candidate set exists
- **THEN** the candidates are reused without requiring a new request

#### Scenario: Offline lookup uses cache

- **WHEN** the device is offline and a cached candidate set exists for the word
- **THEN** the cached candidates are available for selection

### Requirement: Example display on cards

The system SHALL display stored English examples on Current Day, Distillation, and card detail surfaces, with user-authored examples shown before Tatoeba examples. Compact Archive chips SHALL NOT show examples.

#### Scenario: Examples appear with the word

- **WHEN** a card with examples is shown in Current Day, Distillation, or card detail
- **THEN** its English examples are shown with user-authored examples first

#### Scenario: Archive chips omit examples

- **WHEN** a learned or unlearned card is shown in the Archive list
- **THEN** its compact chip shows no examples
