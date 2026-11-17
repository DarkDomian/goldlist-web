# Spec Delta

## MODIFIED Requirements

### Requirement: Card-shaped add action

The Current Day view SHALL provide a card-shaped add button at the top of the list with an accessible inline vector plus icon aligned with its label. Activating it SHALL open the Add Card flow.

#### Scenario: Add action is at the top

- **WHEN** the user opens Current Day
- **THEN** the add button appears as a card with a plus icon above the existing cards

#### Scenario: Add action opens the form

- **WHEN** the user activates the add button
- **THEN** the Add Card input is shown

#### Scenario: Plus icon is accessible

- **WHEN** the add action is rendered
- **THEN** the plus icon is aligned with the label and the button exposes an accessible name

### Requirement: Card summary layout

The Current Day view SHALL render full-width card previews at a fixed height with the status circle in the top-right corner, the English word on the left, the Russian translation below it, and English examples following. When content overflows the fixed height, the final visible line SHALL fade to signal more content, while all content remains available to assistive technology.

#### Scenario: Card content order

- **WHEN** a Current Day card is displayed
- **THEN** the word, translation, and examples appear in that order with the status circle in the top-right

#### Scenario: Cards use full width

- **WHEN** the Current Day list is displayed on a mobile viewport
- **THEN** each card spans the available width

#### Scenario: Overflow shows a fade

- **WHEN** a card's content is taller than the fixed preview height
- **THEN** the final visible line fades and the full content remains in the card

#### Scenario: Content that fits has no fade

- **WHEN** a card's content fits within the fixed preview height
- **THEN** no overflow fade is shown

#### Scenario: Assistive technology receives all content

- **WHEN** a screen reader reads an overflowing card
- **THEN** the hidden examples remain available in the accessibility tree
