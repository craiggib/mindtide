# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Students and independent learners who want a private, focused place to turn their own material into flashcards, study it through active recall, and measure retention with practice tests.

## Product Purpose

MindTide is a local study field journal. It helps a learner organize cards by subject and stack, study without a finish line, build a reusable catalogue of generated multiple-choice questions, and take durable practice tests that can be paused, resumed, and graded.

## Positioning

MindTide combines the quiet ritual of a personal field journal with transparent, user-controlled AI assistance. Cards, generated questions, attempts, and history remain in the learner's browser; Anthropic is contacted only for an explicit question-generation action.

## Operating Context

MindTide runs as a standalone HTML file in a modern browser without installation or a server. Learners may work offline after generating questions. They can export and import the complete journal as JSON for backup and portability.

## Capabilities and Constraints

- Subjects contain stacks; stacks contain Standard or Hidden Pearl flashcards.
- Study sessions support free recall and optional Easy/Hard card labels.
- Testing owns a catalogue of separately generated Easy and Hard questions.
- Test creation is offline and uses only catalogue entries already saved locally.
- Multiple test attempts may remain incomplete, auto-save every answer, and resume after the browser closes.
- Completed tests preserve their frozen question and answer snapshots even when source cards later change or are deleted.
- Optional Anthropic generation uses a user-supplied API key stored separately from journal exports.
- The app has no accounts, shared cloud state, server database, or automatic background generation.

## Brand Commitments

The product name is MindTide. Its default identity is a bright coastal field journal built from sand paper, deep marine ink, sea-glass controls, coral field marks, editorial headings, ruled lists, and calm direct language. Learners may instead choose Rainforest Frogs, using canopy paper, pond greens, amphibian field marks, and original frog illustrations; Outer Space Aliens, using deep-space paper, orbital blues, luminous field marks, and original alien and UFO illustrations; Desert Fossil Dig, using sandstone pages, turquoise tools, fossil strata, and excavation details; or Alpine Field Camp, using cool topo paper, evergreen controls, trail markers, and original mountain goat illustrations. Each is a whole-app extension of the same field-journal system. Themes change atmosphere only; layout, study behavior, readability, and the journal metaphor remain consistent.

## Evidence on Hand

- The incumbent product and design implementation is `MindTide.html`.
- `flashcards.json` and the embedded sample data provide realistic Marine Ecology and Conservation Biology examples.
- No testimonials, usage metrics, or external product claims are available and none should be invented.

## Product Principles

- Keep the learner's material local, portable, and understandable.
- Save the learner's chosen visual theme with the journal so backups remain visually recognizable after import.
- Separate explicit AI generation from offline studying and testing.
- Preserve snapshots of past work rather than silently rewriting history.
- Make recall and progress visible without turning study into a competitive dashboard.
- Stop safely and explain plainly when storage, validation, or network work fails.

## Accessibility & Inclusion

Core workflows must support keyboard use, visible focus, semantic headings and form groups, readable contrast, status announcements, responsive layouts, reduced motion, and zoom without horizontal page scrolling.
