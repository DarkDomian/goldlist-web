# Spec Delta

## Purpose

Lets users move their complete notebook between browsers through a versioned JSON snapshot without a server.

## ADDED Requirements

### Requirement: Versioned snapshot export

The system SHALL export settings, cards, examples, and distillation attempts in one JSON document with `schemaVersion`, `exportedAt`, `appVersion`, and `payload` fields. The export SHALL NOT include transient Tatoeba cache entries.

#### Scenario: Full snapshot is exported

- **WHEN** the user exports their data from Settings
- **THEN** the downloaded JSON contains the current settings, cards, examples, and attempts

#### Scenario: Cache is excluded

- **WHEN** the user exports their data
- **THEN** cached Tatoeba responses are not included in the exported document

### Requirement: Import validation and preview

The system SHALL parse and validate an imported JSON document before changing stored data, and SHALL show a preview with counts of settings, cards, examples, and attempts. Invalid documents SHALL be rejected without modifying existing data.

#### Scenario: Valid import shows a preview

- **WHEN** the user selects a valid export file
- **THEN** the interface shows the record counts and asks how to apply the import

#### Scenario: Invalid import is rejected

- **WHEN** the selected file is malformed, has a missing payload, or contains invalid records
- **THEN** the import is rejected and existing data remains unchanged

### Requirement: Version compatibility

The system SHALL accept the current and older supported `schemaVersion` values by applying explicit migrations, SHALL ignore unknown additive fields, and SHALL reject a newer unsupported schema version with a clear message.

#### Scenario: Older export is migrated

- **WHEN** the user imports a supported older schema version
- **THEN** the data is migrated to the current shape before preview and import

#### Scenario: Unknown fields are ignored

- **WHEN** an imported record contains fields not known to this version
- **THEN** the import proceeds and the unknown fields are ignored

#### Scenario: Newer export is rejected

- **WHEN** the imported document declares a schema version newer than the app supports
- **THEN** the import is rejected with a version error

### Requirement: Merge import

The system SHALL provide a merge import mode that adds valid records without removing existing data. Records whose identifiers or normalized card words conflict with existing data SHALL be skipped, and the system SHALL report the number of imported and skipped records.

#### Scenario: New records are merged

- **WHEN** the user applies a valid import in merge mode
- **THEN** non-conflicting settings, cards, examples, and attempts are added

#### Scenario: Conflicting records are skipped

- **WHEN** an imported record has the same identifier or normalized card word as an existing record
- **THEN** that record and its dependent examples and attempts are skipped and reported

### Requirement: Replace import with backup

The system SHALL provide an explicit replace mode that requires confirmation. Before replacing data, the system SHALL create a downloadable backup of the current snapshot; if the backup cannot be created, the replace SHALL NOT start.

#### Scenario: Replace requires confirmation

- **WHEN** the user chooses replace mode
- **THEN** the interface asks for confirmation before changing any data

#### Scenario: Backup precedes replacement

- **WHEN** the user confirms replace mode
- **THEN** the current data is downloaded as a backup before the imported data replaces it

### Requirement: Atomic import

The system SHALL apply an import as a single transaction. If any write fails, the previous settings, cards, examples, and attempts SHALL remain unchanged.

#### Scenario: Write failure leaves prior data

- **WHEN** an import fails partway through writing records
- **THEN** the previous snapshot remains intact and the failure is reported

#### Scenario: Referential integrity is preserved

- **WHEN** an import is applied
- **THEN** imported examples and attempts reference imported or existing cards, and orphan records are not stored
