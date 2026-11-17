# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Consistent card body spacing

The system SHALL preserve the standard card body padding in fixed-height preview cards and full card views, so previews keep the same internal spacing as the base card.

#### Scenario: Preview keeps the base card padding

- **WHEN** a card is rendered in preview mode
- **THEN** its body uses the same padding as a full card body
