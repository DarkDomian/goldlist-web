# Spec Delta

## Purpose

Provides local English-to-Russian translation for card creation so that adding a word stays fast and user data never leaves the browser.

## ADDED Requirements

### Requirement: Automatic translation on card creation

The system SHALL generate a Russian translation from the submitted English word or phrase using a local translation model before the card is finalized.

#### Scenario: Translation is generated

- **WHEN** the user submits a valid English word and automatic translation is available
- **THEN** the card is populated with the generated Russian translation

#### Scenario: Translation can be edited after generation

- **WHEN** the generated translation is shown
- **THEN** the user can replace it before or after saving the card

### Requirement: Local-only translation

The system SHALL perform translation in the browser and SHALL NOT send the word, translation, or any user data to a server for translation.

#### Scenario: No translation network request

- **WHEN** the user adds a word
- **THEN** translation is computed locally without a translation server request

#### Scenario: Translation works offline after model load

- **WHEN** the translation model is already available locally and the device is offline
- **THEN** translation still completes

### Requirement: On-demand model loading

The system SHALL load the translation model only when translation is first needed and SHALL reuse the loaded or cached model for later translations.

#### Scenario: Model is not loaded at startup

- **WHEN** the app starts and no translation has been requested
- **THEN** the translation model is not loaded

#### Scenario: Later translations reuse the model

- **WHEN** a translation has already been performed in the session
- **THEN** subsequent translations do not reload the full model

### Requirement: Translation progress feedback

The system SHALL show progress while the translation model is loading or translating, including the possibility of an initial download lasting several seconds.

#### Scenario: First translation shows progress

- **WHEN** the user triggers a translation that requires the model to download
- **THEN** the interface shows progress until the translation completes or fails

### Requirement: Translation failure fallback

If the translation model fails to load or translation fails, the system SHALL report the failure and allow the user to enter the Russian translation manually without losing the card.

#### Scenario: Model failure allows manual entry

- **WHEN** the translation model fails to load
- **THEN** the user can enter a Russian translation manually and still create the card

#### Scenario: Translation failure is visible

- **WHEN** translation fails
- **THEN** the interface communicates the failure rather than silently leaving the translation empty

### Requirement: Translation input constraints

The system SHALL translate only English input from the fixed target language and SHALL produce Russian output for the fixed native language.

#### Scenario: Fixed language pair is used

- **WHEN** a translation is requested
- **THEN** the source language is English and the output language is Russian with no user choice of pair
