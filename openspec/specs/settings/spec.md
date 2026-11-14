# settings Specification

## Purpose
Lets users switch the interface theme and view the app version and fixed language pair without exposing unsupported configuration.

## Requirements

### Requirement: Theme switching

The Settings view SHALL be the only place where the user can switch between light and dark themes, and the selected theme SHALL apply immediately and persist across sessions.

#### Scenario: Switch to dark theme

- **WHEN** the user selects the dark theme in Settings
- **THEN** the interface switches to dark immediately and remains dark after a reload

#### Scenario: Switch to light theme

- **WHEN** the user selects the light theme in Settings
- **THEN** the interface switches to light immediately and remains light after a reload

#### Scenario: Theme is not changed elsewhere

- **WHEN** the user is outside Settings
- **THEN** no theme-switching control is available

### Requirement: Default theme

A new installation SHALL start with the light theme unless the user chooses otherwise during onboarding.

#### Scenario: New user starts light

- **WHEN** onboarding completes without changing the theme
- **THEN** the app uses the light theme

### Requirement: App version display

The Settings view SHALL display the current app version read from build metadata.

#### Scenario: Version is shown

- **WHEN** the user opens Settings
- **THEN** the current app version is visible

### Requirement: Read-only language pair

The Settings view SHALL display Russian as the native language and English as the target language, and SHALL NOT allow changing them in this version.

#### Scenario: Languages are visible

- **WHEN** the user opens Settings
- **THEN** Russian and English are shown as the current native and target languages

#### Scenario: Languages cannot be edited

- **WHEN** the user interacts with the language fields
- **THEN** no editing or language-selection control is available

### Requirement: Settings route

The app SHALL expose Settings at `/settings`.

#### Scenario: Settings route opens

- **WHEN** the user navigates to `/settings`
- **THEN** the Settings view is displayed

### Requirement: Unsupported scheduling controls are absent

The Settings view SHALL NOT provide controls for the cutoff time, freeze duration, or language pair in this version.

#### Scenario: No cutoff or freeze controls

- **WHEN** the user opens Settings
- **THEN** no control exists for changing the cutoff time or freeze duration
