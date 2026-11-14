# Spec Delta

## Purpose

Fetches real English usage examples from Tatoeba so each card shows the word in context without manual authoring.

## ADDED Requirements

### Requirement: Example fetching on card creation

The system SHALL request English example sentences for a submitted word from the Tatoeba public API and SHALL attach up to 3 matching examples to the card.

#### Scenario: Examples are attached

- **WHEN** a card is created and Tatoeba returns matching English sentences
- **THEN** up to 3 examples are stored with the card

#### Scenario: Example source is recorded

- **WHEN** an example is stored
- **THEN** its source is recorded as `tatoeba`

### Requirement: Example relevance filtering

The system SHALL prefer sentences containing the exact submitted word and MAY fall back to sentences containing a stemmed form when no exact match exists.

#### Scenario: Exact matches are preferred

- **WHEN** Tatoeba results include both exact-word and stemmed-word sentences
- **THEN** exact-word sentences are selected before stemmed ones

#### Scenario: Stemmed fallback is used

- **WHEN** no sentence contains the exact submitted word but sentences contain a stemmed form
- **THEN** the system may attach suitable stemmed-form examples

### Requirement: Example failure tolerance

If the Tatoeba request fails, times out, or returns no usable sentences, the system SHALL still create the card without examples and SHALL NOT block card creation.

#### Scenario: Request failure does not block the card

- **WHEN** the Tatoeba request fails or times out
- **THEN** the card is created with an empty examples list

#### Scenario: Empty results are allowed

- **WHEN** Tatoeba returns no usable sentences
- **THEN** the card is created with an empty examples list

### Requirement: Example caching

The system SHALL cache Tatoeba responses locally so repeated lookups and offline use can reuse earlier results.

#### Scenario: Cached examples are reused

- **WHEN** the same word is looked up again and a cached response exists
- **THEN** the cached examples are used without requiring a new request

#### Scenario: Offline lookup uses cache

- **WHEN** the device is offline and a cached response exists for the word
- **THEN** the cached examples are attached to the card

### Requirement: Privacy of example lookup

The system SHALL send only the English word or phrase to Tatoeba and SHALL NOT send user identity, card history, or translation data.

#### Scenario: Only the word is sent

- **WHEN** the system queries Tatoeba
- **THEN** the request contains the English word or phrase and no user-specific data

### Requirement: Example display on cards

The system SHALL display stored English examples on card surfaces where the card's content is visible.

#### Scenario: Examples appear with the word

- **WHEN** a card with examples is shown in Current Day or the Archive
- **THEN** its English examples are shown below the word and translation
