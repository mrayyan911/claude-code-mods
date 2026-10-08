# rayyan-handoff-button

A **Handoff** button above the Claude Code prompt. One click writes a single `HANDOFF.md` in your project root, so a fresh session can pick up exactly where this one left off.

It runs two existing handoff skills as one:

- `mattpocock-skills:handoff`: suggested skills for the next agent, redaction of secrets and personal data, and links to existing docs instead of copies
- `claude-mem:handoff`: goal, current state, files in play, failed attempts and why they failed, next steps, and claude-mem memory pointers

## Usage

1. Optionally type what the next session is for in the prompt box.
2. Click **Handoff** (or run `/handoff-all [focus]`). Your draft becomes the "next session focus" and the box is cleared.
3. When the turn finishes, the band shows **HANDOFF.md ready**. Click **Start fresh session** to run `/clear` and pre-fill `Read HANDOFF.md and continue from where we left off.`, then press Enter.

**Reset** clears a band stuck on "Writing combined handoff..." and **Dismiss** hides the ready state.

## Requirements

Install both skill plugins for the combined handoff:

- [`mattpocock-skills`](https://github.com/mattpocock/skills)
- [`claude-mem`](https://github.com/thedotmack/claude-mem)

If only one is installed, the button runs that one alone and says so. If neither is, it shows a message and does nothing.

## What it runs and what it sends

Everything happens inside your Claude Code session. The plugin makes no network requests, starts no processes and reads no files itself.

- **Reads:** the list of available slash commands (to check which handoff skills are installed) and the text in your prompt box when you click.
- **Runs:** the `/mattpocock-skills:handoff` or `/claude-mem:handoff` slash command in your session, which starts a normal Claude turn; and, only when you click **Start fresh session**, `/clear`.
- **Writes:** it clears the prompt box when you click, and fills it with the resume line after **Start fresh session**. It keeps one value, the button's state, in session memory.
- **Files:** `HANDOFF.md` is written by Claude during the handoff turn, under your usual permission settings, in your project root. It stays on your machine. Delete it once the new session has read it, or add it to `.gitignore`.

The handoff document is a summary of your conversation; the instructions ask Claude to redact secrets and personal data, but review it before sharing it.

## License

MIT
