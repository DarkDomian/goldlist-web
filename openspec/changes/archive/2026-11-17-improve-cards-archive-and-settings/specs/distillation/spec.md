# Spec Delta

## MODIFIED Requirements

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
