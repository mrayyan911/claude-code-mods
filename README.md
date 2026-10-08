# claude-code-mods

Mods for [Claude Code](https://docs.claude.com/en/docs/claude-code).

## handoff-button

A **Handoff** button above the prompt. One click writes a single `HANDOFF.md` in the project root by running two handoff skills together:

- `mattpocock-skills:handoff`: suggested skills, redaction, and links to existing docs instead of copies
- `claude-mem:handoff`: goal, current state, files in play, failed attempts, next steps, and memory pointers

Anything typed in the prompt box when you click becomes the "next session focus". When the handoff is written, **Start fresh session** runs `/clear` and pre-fills `Read HANDOFF.md and continue from where we left off.`

Also available as a command: `/handoff-all [what the next session is for]`.

### Install

Type this at the Claude Code prompt:

```
/plugin install handoff-button --marketplace mrayyan911/claude-code-mods
```

Answer `y` to add the marketplace, then pick a scope (user scope makes it available in every session).

### Requirements

Install both skill plugins for the combined handoff:

- [`mattpocock-skills`](https://github.com/mattpocock/skills)
- [`claude-mem`](https://github.com/thedotmack/claude-mem)

If only one is installed, the button runs that one alone and tells you so.

`HANDOFF.md` is a scratch file: delete it after the new session has read it, or add it to `.gitignore`.

## License

MIT
