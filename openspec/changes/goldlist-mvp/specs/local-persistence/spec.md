# Spec Delta

## Purpose

Guarantees that all user data is stored and hydrated locally so the app works without accounts or a backend and survives reloads and offline use.

## ADDED Requirements

### Requirement: IndexedDB persistence

The system SHALL persist settings, cards, examples, and distillation attempts in the browser's IndexedDB database.

#### Scenario: Card is persisted

- **WHEN** a card is created or changed
- **THEN** the card is written to IndexedDB

#### Scenario: Settings are persisted

- **WHEN** the user changes a setting
- **THEN** the setting is written to IndexedDB

#### Scenario: Attempts are persisted

- **WHEN** a distillation attempt is recorded
- **THEN** the attempt is written to IndexedDB

### Requirement: Startup hydration

The system SHALL load persisted settings and card data before rendering user-specific screens.

#### Scenario: Reload restores state

- **WHEN** the user reloads the app
- **THEN** the previously stored cards, settings, and attempts are restored

#### Scenario: No flash of empty state before hydration

- **WHEN** the app starts with existing data
- **THEN** the interface does not present an empty collection as final before hydration completes

### Requirement: Persistent storage request

The system SHALL request persistent browser storage on first launch so the browser is less likely to evict app data.

#### Scenario: Persistence is requested once

- **WHEN** the app is launched for the first time
- **THEN** it requests persistent storage from the browser

#### Scenario: Request failure does not block the app

- **WHEN** the persistent storage request is denied or unsupported
- **THEN** the app continues to work using normal IndexedDB storage

### Requirement: Offline core flows

After the first successful load, the system SHALL allow adding cards, viewing Current Day, processing cutoffs, distilling, viewing the Archive, and changing settings without a network connection.

#### Scenario: Core flow works offline

- **WHEN** the device is offline and the app has loaded before
- **THEN** core flows remain available and local data is usable

#### Scenario: Tatoeba is the only network dependency

- **WHEN** the device is offline
- **THEN** example fetching may be unavailable but translation, scheduling, distillation, and archive behavior still work

### Requirement: No server-side user data

The system SHALL NOT require an account and SHALL NOT send stored cards, translations, attempts, or settings to a server.

#### Scenario: No account is needed

- **WHEN** the user starts the app
- **THEN** no sign-in or account creation is required

#### Scenario: User data stays local

- **WHEN** the app stores or reads user data
- **THEN** that data is handled locally in the browser

### Requirement: Atomic state changes

The system SHALL write a distillation attempt and its resulting card status change together so a failure cannot persist only one of them.

#### Scenario: Attempt and status stay consistent

- **WHEN** a distillation attempt is saved
- **THEN** the attempt record and the card's new status are committed together

#### Scenario: Write failure leaves prior state

- **WHEN** a combined write fails
- **THEN** neither the attempt nor the status change is persisted

### Requirement: Schema versioning

The system SHALL version its local database schema and SHALL preserve existing user data when the schema is upgraded.

#### Scenario: Upgrade keeps data

- **WHEN** the app opens a database created by an earlier compatible schema version
- **THEN** existing cards, settings, and attempts remain available after the upgrade
