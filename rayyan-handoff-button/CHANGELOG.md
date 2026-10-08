# Changelog

All notable changes to `rayyan-handoff-button` are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the plugin uses [Semantic Versioning](https://semver.org/).

## [0.2.1] - 2026-10-08

### Added

- `CHANGELOG.md`.

## [0.2.0] - 2026-10-08

### Changed

- **Breaking:** renamed the plugin from `handoff-button` to `rayyan-handoff-button`. Uninstall `handoff-button` and install `rayyan-handoff-button`; an update does not carry over.
- Renamed the plugin folder to `rayyan-handoff-button` to match.

### Added

- Plugin README describing usage, requirements, and what the plugin runs and sends.

## [0.1.0] - 2026-10-08

### Added

- **Handoff** button above the prompt that writes one combined `HANDOFF.md` by running `mattpocock-skills:handoff` with `claude-mem:handoff` folded in.
- Prompt-box text at click time becomes the next session's focus.
- **Start fresh session** button that runs `/clear` and pre-fills the resume prompt.
- `/handoff-all [focus]` command.
- Falls back to whichever handoff skill is installed when only one is.
