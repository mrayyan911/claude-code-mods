# rename-session-mod

Names a Claude Code session after the work done in it. The name shows live in the session from your next prompt, and it is saved when the session ends. A session ends when you exit, run `/clear`, or switch to another session with `/resume`. The name is what `/resume` lists.

- A session gets a name only if at least one of your turns ran since it was last named. If you open an old session and leave without doing anything, its name stays as it was.
- A session you named yourself with `/rename` keeps that name, and the mod spends no model calls on it.

## Install

Type this at the Claude Code prompt:

```
/plugin install rename-session-mod --marketplace mrayyan911/claude-code-mods
```

The mod needs `node` on `PATH`.

## How a session gets its name

1. After each of your turns, Haiku reads the session and writes a title of 3 to 7 words. The call runs in the background, so the turn does not wait for it. Turns that subagents run do not count.
2. The title is saved to `<tmp dir>/rename-session-mod/<session id>.txt`. On your next prompt, a command hook in `hooks/live-title.cjs` reads that file and sets it as the session's name. Claude Code then writes the name to the transcript itself.
3. When the session ends, the mod deletes the title file and appends two lines to the session's transcript, `~/.claude/projects/<project>/<session id>.jsonl`:

	```json
	{"type":"custom-title","customTitle":"Fix login bug","sessionId":"<session id>"}
	{"type":"agent-name","agentName":"Fix login bug","sessionId":"<session id>"}
	```

	`/rename` writes the same two lines, so `/resume` shows the name the same way. When you resume the session, the command hook finds no title file and sets the last `custom-title` in the transcript as the name.

Haiku gets each message cut to 500 characters, without system reminders or slash-command echoes such as `/clear`. If the session text is longer than 24,000 characters, Haiku gets the first quarter and the last three quarters of that budget, so it sees the opening ask and the latest work.

## How it skips sessions you renamed with /rename

When you run `/rename`, Claude Code writes a transcript row that carries `"commandRun":{"command":"rename"}`. That row is the signal. A `custom-title` line alone is not proof: `/clear` copies the previous session's name into the new session, so a session can have a name you never gave it.

`hooks/append-title.cjs` reads the transcript and looks for that row. The mod runs the script at two points. The live hook does the same check before it sets a name, so it never overwrites a name you chose:

- **Before each Haiku call**, with no title argument. The script exits with `2` if it finds the row, and the mod then makes no Haiku call for that session for the rest of its life. A `/rename` stays in the transcript, so the mod stops checking once it finds one.
- **Before writing the title**, with the title argument. This check catches a `/rename` you run after the last turn. If the script finds the row, it exits with `2` and writes nothing.

A turn that finished before you ran `/rename` has already paid for its title. The second check still keeps that title out of the transcript.

## Load it from a folder

To run the mod from a clone of this repository instead of installing it, add its folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`. `~` is allowed. Separate several folders with `;` on Windows and `:` on macOS and Linux:

```json
"env": {
	"CLAUDE_CODE_PLUGIN_DIRS": "~/claude-code-mods/rename-session-mod"
}
```

A session reads the variable when it starts, so a change reaches new and resumed sessions only. To turn the mod off, remove its folder from the list.

The mod writes to the transcript through `node` because a hooks module has no way to append to a file, and `$.fs.write` would rewrite the whole transcript.

## Files

| File | What it does |
| --- | --- |
| `hooks/register.ts` | The hooks module. Its `turn.complete` hook starts the title job, and its `session.end` hook writes the title. |
| `hooks/live-title.cjs` | Saves the title to a file, and as a command hook on `UserPromptSubmit` and `SessionStart` prints it as the session's name. |
| `hooks/transcript.cjs` | Finds a transcript by session id and checks it for a `/rename` row. |
| `hooks/append-title.cjs` | Checks the transcript with `transcript.cjs` and appends the title lines. Exit codes: `0` appended or not renamed, `1` no transcript found, `2` renamed with `/rename`. |
| `hooks/register.test.ts` | Tests for the hooks module. |
| `hooks/append-title.test.cjs` | Tests for the append script, run against throwaway transcripts. |
| `hooks/live-title.test.cjs` | Tests for the live title script. |

## Test and debug it

Run both test suites from this folder:

```
claude plugin test .
node --test hooks/append-title.test.cjs hooks/live-title.test.cjs
```

To see what the mod did in a session, start Claude Code with `claude --debug`. Then search `~/.claude/debug/<session id>.txt` for `rename-session-mod:`. The log shows each title Haiku wrote, each `/rename` the mod kept, and each failed append.

## Before you change it

- Hook `turn.complete`, not `classic.Stop`. The built-in `cc-plugin-sec-default` plugin passes `classic.*` events on before they reach a user mod, so a `classic.Stop` hook never runs.
- A `session.end` hook gets about 1.5 seconds for the whole chain. A Haiku call does not fit in that time, so the title is written after each turn and only appended at the end.

## Limits

- The live name is one turn behind. The first titled turn sets the name on your next prompt, and each later title shows one prompt after it was written.
- A hooks module cannot set the name, so the live name comes from the command hook. A title file is deleted when its session ends. If Claude Code is killed instead of exiting, the file stays in the tmp dir until the OS clears it.
- If you exit within about a second of a reply, the title for that last turn may not be ready. The session then keeps the previous turn's title, or gets no new name if it was the first turn.
- If the mod reloads during a session, it forgets the turns that ran before the reload.
- The mod only detects names you set with `/rename`. A name set any other way can be overwritten.
- Sessions you have not renamed cost one Haiku call per turn.

## License

MIT
