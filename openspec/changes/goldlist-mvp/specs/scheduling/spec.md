# Spec Delta

## Purpose

Owns the calendar-based cutoff, freeze, and due-date rules that move cards from Current Day into waiting and make them available for distillation.

## ADDED Requirements

### Requirement: Fixed midnight cutoff

The system SHALL run the daily cutoff at 00:00 local time with no user-configurable cutoff time in this version.

#### Scenario: Cutoff occurs at local midnight

- **WHEN** the device's local clock reaches 00:00
- **THEN** the daily cutoff is processed

#### Scenario: Cutoff time is not editable

- **WHEN** the user opens Settings
- **THEN** no control is available to change the cutoff time

### Requirement: Cutoff scheduling formula

At the cutoff, the system SHALL set each Current Day card's `scheduledFor` to local midnight on the calendar day 14 days after the card's creation day, using `startOfDay(createdAt) + 14 days`.

#### Scenario: Card added on day D is due on day D+14

- **WHEN** a card created at any time on day D is processed by the cutoff
- **THEN** its `scheduledFor` is local midnight at the start of day D+14

#### Scenario: Time of day does not affect due date

- **WHEN** two cards are created on the same day at different times
- **THEN** both receive the same `scheduledFor` value

### Requirement: Waiting status after cutoff

After scheduling, the system SHALL keep the card's distillation status and treat it as a waiting card outside Current Day.

#### Scenario: Card becomes waiting

- **WHEN** the cutoff schedules a copper card
- **THEN** the card remains `copper` and is shown as a waiting card in the Archive

### Requirement: Failed-attempt freeze

When a distillation attempt fails, the system SHALL set the card's `scheduledFor` to `startOfDay(attemptedAt) + 14 days` so the next attempt is due at local midnight 14 calendar days later.

#### Scenario: Failed card is frozen from the attempt day

- **WHEN** a distillation attempt on day D is incorrect and the card advances to silver or gold
- **THEN** its `scheduledFor` is local midnight at the start of day D+14

#### Scenario: Unlearned cards are not rescheduled

- **WHEN** a gold card fails a distillation
- **THEN** the card becomes unlearned and is not given a new `scheduledFor`

### Requirement: Due-card definition

The system SHALL consider a card due when it is waiting and its `scheduledFor` is less than or equal to the current time.

#### Scenario: Due at local midnight

- **WHEN** the local clock reaches a waiting card's `scheduledFor` time
- **THEN** the card becomes due

#### Scenario: Future cards are not due

- **WHEN** a waiting card's `scheduledFor` is in the future
- **THEN** the card is not due

### Requirement: Missed cutoff processing

On startup, the system SHALL process any cutoff that occurred while the app was not running for cards that were added before that cutoff.

#### Scenario: Startup after inactivity

- **WHEN** the app starts after one or more midnights have passed since cards were added
- **THEN** those cards are scheduled as if the missed cutoff had run

#### Scenario: Multiple missed days are handled

- **WHEN** the app has been closed for several days
- **THEN** all affected Current Day cards receive the correct past cutoff scheduling

### Requirement: Calendar-based batches

Because due dates are calendar-based, cards added on consecutive days SHALL become due on consecutive days at local midnight, producing a daily distillation batch after the initial freeze period.

#### Scenario: Consecutive additions create consecutive batches

- **WHEN** cards are added on days D and D+1
- **THEN** they become due at midnight on days D+14 and D+15 respectively

### Requirement: Cutoff during a distillation session

If the cutoff time arrives during a distillation session, the system SHALL allow the in-progress distillation to finish and SHALL process the cutoff afterward.

#### Scenario: In-progress attempt completes first

- **WHEN** the user submits a distillation answer at the cutoff minute
- **THEN** the attempt is recorded and the cutoff is processed after it completes

### Requirement: Local timezone behavior

The system SHALL evaluate cutoff and due times in the device's current local timezone so that a timezone change changes when local midnight occurs.

#### Scenario: Local midnight follows the device

- **WHEN** the device timezone changes
- **THEN** subsequent cutoff and due-time calculations use the new local timezone
