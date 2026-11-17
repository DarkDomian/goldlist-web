# Spec Delta

## MODIFIED Requirements

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
