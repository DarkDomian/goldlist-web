# translation Specification

## Purpose
Provides local English-to-Russian translation for card creation so that adding a word stays fast and user data never leaves the browser.

## Requirements

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

The system SHALL expose one shared model-loading status to all translation consumers. The status SHALL represent queued, downloading with aggregate progress, initializing, ready, and error states, SHALL be identical for concurrent consumers, and SHALL display the percentage above the progress bar rather than in the status summary.

#### Scenario: First translation shows progress

- **WHEN** the first translation requires a model download
- **THEN** all translation consumers see the same queued, downloading, and initializing status

#### Scenario: Concurrent requests share one status

- **WHEN** more than one translation is requested while the model is loading
- **THEN** the interface shows one shared progress display instead of competing per-request displays

#### Scenario: Aggregate progress is shown above the bar

- **WHEN** the model download reports progress
- **THEN** the percentage appears above the progress bar and the summary describes the current phase

#### Scenario: WebGPU fallback uses the same status

- **WHEN** the model falls back from WebGPU to WASM
- **THEN** the fallback is reflected in the same shared status without resetting the user's view

#### Scenario: Failure reaches every consumer

- **WHEN** model loading or translation fails
- **THEN** the shared status reports the error to every waiting consumer

#### Scenario: Ready status replaces progress

- **WHEN** the model finishes loading
- **THEN** the shared status reports ready and the progress display is cleared

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
