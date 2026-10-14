# next-steps-sticky

A copy of [next-steps](https://github.com/anthropics/claude-plugins-community) by Thariq Shihipar (MIT) with one change: the suggestions stay up after you pick one.

- Press `1`, `2` or `3` from an empty prompt box, or click a suggestion, and it goes into the box as a draft. The pick is marked with ✓.
- Click another suggestion to replace the draft with it. The number keys only work while the box is empty, so once a draft is in, switch by clicking.
- `0` dismisses the list. Sending a prompt also hides it.

Everything else (Tab for the top suggestion, the `minAnswerChars` and `suggestSkills` options) works as in next-steps.

## Install

Type this at the Claude Code prompt:

```
/plugin install next-steps-sticky --marketplace mrayyan911/claude-code-mods
```

Then turn off the original next-steps (`/plugin`, or `"next-steps@claude-community": false` in `enabledPlugins`) so the two don't both draw a list.

## Loading it from this folder

On this machine it loads from this folder through `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json`, with the original `next-steps@claude-community` turned off so the two don't both draw a list. Options live under `pluginConfigs.next-steps-sticky`.

To go back to the original: set `next-steps@claude-community` to `true` in `enabledPlugins` and remove this folder from `CLAUDE_CODE_PLUGIN_DIRS`.

## License

MIT. Based on next-steps 1.0.0, copyright Thariq Shihipar, licensed MIT.
