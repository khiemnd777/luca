# Design System: Noah Admin UI

This file defines the current UI design language for the frontend in this repository. It is written for coding agents and design-aware tooling so new screens, widgets, forms, and data views stay visually aligned with the existing admin application.

This is a documentation artifact for the current baseline, not a redesign brief. When the codebase is inconsistent, prefer the dominant pattern already present in `fe/**`, especially shared MUI primitives, shared page shells, the auto-form stack, and the schema-table stack.

## 1. Visual Theme & Atmosphere

The product is an internal admin application, not a marketing site. The visual direction should feel:

- operational
- stable
- compact but readable
- neutral and professional
- more task-oriented than brand-expressive

The UI should prioritize throughput and clarity for authenticated users who spend time managing records, reviewing statuses, editing entities, and navigating dense information.

Design for practical workflows:

- clear page titles and action areas
- predictable table and form behavior
- readable information hierarchy
- explicit loading, empty, confirmation, and error states
- fast scanning across sidebars, toolbars, cards, grids, and tables

Avoid playful or editorial styling. This UI should feel like a reliable work surface.

## 2. Color Palette & Roles

The current theme is defined in `fe/src/app/theme.ts` and should be treated as the primary source of color truth.

### Core theme colors

- **Primary Blue**: `#1976d2`
  Use for primary actions, selected states, emphasis, contained buttons, and interactive highlights.
- **Secondary Purple**: `#9c27b0`
  Use sparingly for secondary accents where an existing MUI component already expects a secondary color role.
- **App Background**: `#f9f9fb`
  Use for the main application canvas and the large working surface behind cards, panels, and content shells.
- **Surface White**: `#ffffff`
  Use for paper surfaces, dialogs, tables, cards, and content containers.

### Semantic usage rules

- Use MUI semantic palette roles before inventing raw hex usage.
- Most screens should be light surfaces on a light app background with subtle separation through borders, dividers, and contained papers.
- Prefer `text.primary`, `text.secondary`, `divider`, and MUI status colors for standard states instead of custom status palettes.
- Critical or destructive actions should use standard MUI destructive semantics rather than introducing custom warning palettes.
- Color should support state recognition, not become decoration.

### Contrast guidance

- Preserve readable contrast on all text and action controls.
- Keep dense data UIs visually calm. Prefer one strong accent color with neutral surfaces rather than multiple competing bright accents.

## 3. Typography Rules

Typography is defined by the MUI theme and should remain simple, modern, and highly legible.

### Font family

- Primary UI font: `Inter`
- Fallbacks: `Roboto`, `Helvetica`, `Arial`, `sans-serif`

### Base hierarchy

- `h1`: `2rem`, weight `600`
- `h2`: `1.5rem`, weight `500`
- `body1`: `1rem`

### Practical hierarchy rules

- Use strong, compact page titles rather than oversized hero headings.
- Toolbar titles and section titles should feel decisive and functional.
- Supporting descriptions and metadata should usually use secondary text color and smaller body styles.
- Avoid decorative display typography, excessive tracking, or dramatic weight jumps.
- Prefer sentence case or human-readable labels. Do not overuse all caps.

### Text behavior

- Use `noWrap` or truncation where the existing toolbar and sidebar patterns already do so.
- Dense admin layouts should preserve scanability first. Long metadata can truncate in navigation and headers, but tables and forms should still expose meaningful labels.

## 4. Component Stylings

Use MUI first, then shared primitives from `fe/src/core` and `fe/src/shared`, then feature-local components only when the shared system does not already solve the use case.

### Page shells

- Default to existing shared shells such as `BasePage`, `GeneralPage`, `OneColumnPage`, and `PageContainer`.
- The global frame is app-shell based:
  - fixed vertical sidebar
  - top content toolbar
  - content area on a light background
- Sidebar width behavior should remain practical and compact:
  - expanded for readable labels
  - collapsed for smaller viewports or tighter workflows

### Toolbars and headers

- Use a left-to-right toolbar hierarchy:
  - optional back action
  - page title
  - optional subtitle
  - actions on the right
- Titles should be visually stronger than subtitles.
- Action groups should stay on the right and feel horizontally aligned, not scattered down the page.

### Cards and surfaces

- Prefer MUI `Paper`, dialogs, cards, and section containers with white surfaces on the app background.
- Keep corners moderately rounded, aligned with the theme border radius of `8px`.
- Surfaces should separate information through spacing, borders, and dividers more than through heavy color fills.

### Forms

- Prefer the shared auto-form stack in `fe/src/core/form`.
- Standard form presentation is:
  - schema-driven fields
  - clear labels
  - inline validation
  - action buttons in dialog/footer actions
- Use `FormDialog` for create and edit flows that fit modal interaction.
- Default form dialogs should feel neutral and utilitarian:
  - full-width within the chosen max width
  - titled header
  - divided content area
  - cancel on the left, primary confirm on the right
- Use contained primary buttons for the main submit action.

### Tables and dense data views

- Prefer the schema-table and auto-table infrastructure in `fe/src/core/table`.
- Tables are a first-class UI surface in this repo. Optimize for:
  - readable columns
  - consistent row actions
  - pagination and sorting clarity
  - confirmation for destructive actions
- Use tables for operational list views instead of building bespoke card grids for management data.
- Support dense information, but never at the expense of ambiguous headers or hidden actions.

### Dialogs and confirmations

- Use standard dialogs for confirm, upload, and form flows where those shared primitives already exist.
- Confirmation dialogs should be explicit and unambiguous, especially around deletes and irreversible actions.
- Destructive actions should require a clear confirmation step.

### Status and feedback

- Status indicators should be concise and scannable.
- Loading, error, and empty states should always be visible and operationally useful.
- Toasts can support feedback, but should not be the only place critical information appears.

## 5. Layout Principles

The layout language should support structured admin workflows rather than open-ended visual exploration.

### Spacing and density

- Use compact-to-moderate spacing.
- Favor consistency over large visual gestures.
- Group related controls tightly enough to feel connected, but leave enough space to keep forms and tables readable.

### Grid and composition

- Prefer existing shared layout helpers such as `PageContainer`, `AutoGrid`, `ResponsiveGrid`, `Section`, and slot-driven page composition.
- For multi-column pages, keep the structure obvious:
  - action area at the top
  - content grouped into sections
  - related data visually clustered
- Do not create asymmetrical or highly art-directed layouts for standard admin flows.

### Whitespace strategy

- Use whitespace to separate sections and clarify task boundaries.
- Avoid both extremes:
  - cramped pages where controls collapse into noise
  - oversized gaps that make admin screens feel empty or inefficient

### Navigation layout

- Keep the sidebar as the primary navigation anchor.
- Hidden detail pages should still inherit the same shell and header language as visible routes.

## 6. Depth & Elevation

Depth should be subtle and functional.

- Use flat or near-flat surfaces by default.
- Prefer borders, dividers, and clean paper separation over dramatic shadows.
- Elevation should communicate layering only when needed:
  - dialogs above page content
  - sidebar as a persistent structural surface
  - cards or papers to separate sections from the app background

Avoid glossy, floating, or cinematic depth treatments. This application should feel stable, not theatrical.

## 7. Do's and Don'ts

### Do

- Use MUI components and theme semantics first.
- Reuse shared page, form, dialog, table, and layout primitives.
- Keep page titles, actions, and section boundaries obvious.
- Favor data-dense but readable layouts.
- Use explicit states for loading, errors, empty results, and confirmation flows.
- Keep labels human-readable and operationally clear.
- Preserve consistency between list pages, detail pages, and dialog workflows.

### Don't

- Do not invent a separate visual system for one screen or one feature.
- Do not use gradients, glassmorphism, landing-page hero treatments, glow effects, or decorative visual noise.
- Do not replace shared form or table infrastructure with bespoke patterns unless the repo already requires it.
- Do not scatter actions across the page when a toolbar or dialog footer is the established place.
- Do not expose raw DTO field names, transport-shaped labels, or backend structure directly in UI copy.
- Do not rely on color alone to convey important operational meaning.
- Do not make internal admin screens look like consumer marketing pages.

## 8. Responsive Behavior

Responsive behavior should preserve usability and task completion, not just visual fit.

### Shell behavior

- The sidebar may collapse on smaller screens or tighter layouts.
- The main content area should continue to prioritize titles, actions, and the primary work surface.

### Tables and data-heavy screens

- On smaller widths, preserve the most important columns and actions first.
- Allow layouts to stack or compress in a predictable way instead of forcing decorative responsiveness.
- Avoid horizontal chaos. If a dense data surface cannot fully collapse, keep the hierarchy readable and maintain action access.

### Forms and dialogs

- Forms should reflow cleanly on smaller widths.
- Dialogs should remain full-width within their configured breakpoint and keep actions reachable.
- Touch targets should remain usable without making the layout feel oversized on desktop.

### General rule

- Responsiveness in this repo is practical:
  - collapse when necessary
  - stack when helpful
  - preserve control clarity
  - keep the workflow intact

## 9. Agent Prompt Guide

Use these rules when generating or refactoring UI in this repo.

### Quick design summary

- Build an internal admin UI, not a marketing site.
- Use MUI and existing shared frontend primitives.
- Keep the app light-themed, operational, and data-oriented.
- Use `#1976d2` as the main action color and `#f9f9fb` as the app background.
- Prefer white surfaces, moderate rounding, compact spacing, and strong information hierarchy.
- Default to shared page shells, auto-form patterns, schema-table patterns, and right-aligned page actions.

### Preferred component stack

- App shell: `BasePage`
- Page composition: `GeneralPage`, `OneColumnPage`, `PageContainer`, `AutoGrid`, `Section`
- Toolbar/header: `PageToolbar` and slot-hosted actions
- Forms: `useAutoForm`, `AutoFormFields`, `FormDialog`
- Tables: `AutoTable`, `SchemaTable`
- Dialogs: shared confirm/upload/form dialogs

### Example prompts

**New list page**

> Build a new internal admin list page for this repo using the existing MUI-based shared UI system. Use the standard page shell, a clear page toolbar with title on the left and actions on the right, and the shared schema-table pattern for the main content. Keep the layout compact, readable, and operational.

**Detail page**

> Build a detail page that matches the current Noah admin UI. Use the existing page shell, include an optional back action, keep the title and subtitle compact, and organize content into clear white surface sections on the light app background. Avoid marketing-style visuals.

**Form dialog**

> Build a create or edit flow using the shared auto-form and form-dialog patterns. Use schema-driven fields, inline validation, a neutral MUI dialog layout, cancel on the left, and a contained primary save action on the right.

**Dashboard card section**

> Build a dashboard section for an internal admin screen using MUI surfaces and the current Noah design language. Keep the cards restrained, readable, and data-first. Use subtle separation, compact spacing, and clear labels. Do not use gradients, glassmorphism, or promotional styling.
