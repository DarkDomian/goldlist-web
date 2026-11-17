# Spec Delta

## Purpose

Defines predictable route scrolling, focus, and stable mobile app-shell layout.

## ADDED Requirements

### Requirement: Route scroll restoration

The system SHALL start a newly opened route at the top of the page and SHALL preserve the browser's normal back and forward scroll behavior.

#### Scenario: New route starts at the top

- **WHEN** the user navigates from one primary screen to another
- **THEN** the new screen is scrolled to the top

#### Scenario: History navigation is not overridden

- **WHEN** the user navigates back or forward through browser history
- **THEN** the app preserves the browser's normal scroll restoration behavior

### Requirement: Route focus management

The system SHALL move focus to the main content region after a route change when the navigation was initiated by a keyboard or assistive action, and SHALL NOT render a skip-to-content link.

#### Scenario: Focus moves to the new screen

- **WHEN** the user changes screens with the keyboard
- **THEN** focus moves to the main content or its heading and no skip-link is displayed

#### Scenario: Pointer navigation does not steal focus

- **WHEN** the user changes screens with a pointer
- **THEN** the route content is shown without unexpectedly moving focus into an input

### Requirement: Stable mobile app-shell layout

The header and bottom navigation SHALL remain aligned and stable when route content height changes, the mobile browser chrome changes, or a scrollbar appears. Header items SHALL share a common vertical center line.

#### Scenario: Switching routes does not move the menu

- **WHEN** the user switches between Settings and Current Day on a narrow viewport
- **THEN** the header and bottom navigation keep the same position and alignment

#### Scenario: Header items stay aligned

- **WHEN** the app header is shown on any supported viewport
- **THEN** its brand, tagline, and other items remain vertically centered together
