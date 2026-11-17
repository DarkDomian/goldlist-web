# distillation Specification

## Purpose
Runs the spaced retrieval test that moves cards through copper, silver, and gold until they are learned or become unlearned.

## Requirements

### Requirement: Due-card distillation queue

The Distillation view SHALL present waiting cards whose `scheduledFor` is less than or equal to the current time, one card at a time.

#### Scenario: Due cards are listed

- **WHEN** the user opens Distillation and due waiting cards exist
- **THEN** those cards are available for testing in a card-by-card session

#### Scenario: Future and archived cards are excluded

- **WHEN** a card is not due or is learned or unlearned
- **THEN** it is not included in the Distillation queue

### Requirement: Distillation card presentation

While testing a card, the system SHALL show a fixed-height preview of the English word, its English examples, and a copper, silver, or gold status indicator, and SHALL hide the Russian translation until the answer is submitted. Overflowing content SHALL fade at the final visible line while remaining available to assistive technology.

#### Scenario: Translation is hidden before submission

- **WHEN** a due card is displayed for testing
- **THEN** its Russian translation is not visible

#### Scenario: Word and examples are visible

- **WHEN** a due card is displayed for testing
- **THEN** the English word, examples, and current status indicator are visible

#### Scenario: Overflow fades during recall

- **WHEN** a due card's content is taller than the fixed preview height
- **THEN** the final visible line fades and the full content remains available to assistive technology

#### Scenario: Fitting content has no fade

- **WHEN** a due card's content fits within the fixed preview height
- **THEN** no overflow fade is shown

### Requirement: Typed Russian answer

The system SHALL provide an input for the user to type the Russian translation of the displayed English word and SHALL submit the answer for local evaluation.

#### Scenario: User submits an answer

- **WHEN** the user types a Russian answer and submits it
- **THEN** the answer is evaluated locally against the card's translation

### Requirement: Local normalized answer comparison

The system SHALL evaluate answers locally by lowercasing, trimming, removing punctuation, and collapsing whitespace, and SHALL accept any translation variant separated by a comma, semicolon, or slash.

#### Scenario: Case and spacing are ignored

- **WHEN** the user's answer differs from a stored translation only by case, punctuation, or extra whitespace
- **THEN** the answer is accepted as correct

#### Scenario: Listed variant is accepted

- **WHEN** the card's translation contains variants such as "дом, жилище" and the user types "жилище"
- **THEN** the answer is accepted as correct

#### Scenario: Different word is rejected

- **WHEN** the user's answer does not match any normalized translation variant
- **THEN** the answer is evaluated as incorrect

#### Scenario: Evaluation is immediate and local

- **WHEN** the user submits an answer
- **THEN** the result is produced without a network request

### Requirement: Correct answer outcome

When the user's answer is correct at any stage, the system SHALL set the card's status to `learned`, clear `scheduledFor`, move it to the Archive's learned block, and show success feedback.

#### Scenario: Copper card passes

- **WHEN** a copper card receives a correct answer
- **THEN** it becomes learned and leaves active rotation

#### Scenario: Silver or gold card passes

- **WHEN** a silver or gold card receives a correct answer
- **THEN** it becomes learned with `scheduledFor` null

### Requirement: Incorrect answer outcome

When the user's answer is incorrect at copper or silver, the system SHALL advance the status by one stage, freeze the card for 14 calendar days, move it to the waiting block, and show the correct translation.

#### Scenario: Copper failure becomes silver

- **WHEN** a copper card receives an incorrect answer
- **THEN** it becomes silver, receives a new `scheduledFor`, and returns to waiting

#### Scenario: Silver failure becomes gold

- **WHEN** a silver card receives an incorrect answer
- **THEN** it becomes gold, receives a new `scheduledFor`, and returns to waiting

#### Scenario: Correct translation is shown as feedback

- **WHEN** an answer is incorrect
- **THEN** the card's Russian translation is shown to the user

### Requirement: Gold failure outcome

When the user's answer is incorrect at gold, the system SHALL set the card's status to `unlearned`, leave it unscheduled, move it to the Archive's unlearned block with its translation, and stop testing it unless it is re-learned.

#### Scenario: Gold failure becomes unlearned

- **WHEN** a gold card receives an incorrect answer
- **THEN** it becomes unlearned and is archived with its translation

#### Scenario: Unlearned cards leave rotation

- **WHEN** a card is unlearned
- **THEN** it does not appear in future Distillation queues unless re-learned

### Requirement: Attempt history

The system SHALL record every distillation attempt with its identifier, card identifier, attempt time, user answer, expected answer, correctness, previous status, and resulting status.

#### Scenario: Successful attempt is recorded

- **WHEN** a distillation answer is submitted
- **THEN** an attempt record is stored with the previous and resulting statuses

#### Scenario: Failed attempt is recorded

- **WHEN** an incorrect answer is submitted
- **THEN** an attempt record stores the incorrect answer and the status transition

### Requirement: Due badge

On startup and when due cards exist, the system SHALL indicate that the Distillation section has due cards.

#### Scenario: Badge appears when cards are due

- **WHEN** the app starts with at least one due card
- **THEN** the Distillation section shows a due indicator

### Requirement: Distillation empty state

The Distillation view SHALL show an empty state when no cards are due.

#### Scenario: No due cards

- **WHEN** the user opens Distillation with no due cards
- **THEN** an empty state is shown and no session starts
