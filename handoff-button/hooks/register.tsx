import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

const MATT = 'mattpocock-skills:handoff'
const MEM = 'claude-mem:handoff'
const RESUME = 'Read HANDOFF.md and continue from where we left off.'

const phase = atom({ plugin: 'handoff-button', key: 'phase' } as const, 'idle')

// The next turn to start after a click is the handoff's (a command queued
// behind a running turn waits for it), and only its end marks the band done.
let armed = false
let handoffTurn: string | null = null

// The args handed to the slash command: they fold the other skill in, so one
// turn produces one document instead of two competing ones.
function combinedArgs(focus: string, other: string | null): string {
  const lines = [
    `Next session focus: ${focus || 'continue the current work where it stands'}.`,
    '',
    'This is a COMBINED handoff, written as ONE document:',
  ]
  if (other) {
    lines.push(
      `- Before writing anything, invoke the \`${other}\` skill with the Skill tool and follow its instructions as well.`,
    )
  }
  lines.push(
    "- Merge both skills' requirements: claude-mem's sections (Goal, Current State, Files in Play, What Has Been Tried, Current Best Theory, Next Steps, Key Constraints, Memory Pointers) plus a \"Suggested skills\" section.",
    '- Reference existing specs, plans, issues, commits and PRs by path or URL instead of duplicating them. Redact secrets and PII.',
    '- Write it to `HANDOFF.md` in the project root (this overrides any temp-dir location). Do not commit it.',
  )
  return lines.join('\n')
}

async function runHandoff($: EngineInterface): Promise<string> {
  const names = new Set((await $.command.list()).map(c => c.name))
  const hasMatt = names.has(MATT)
  const hasMem = names.has(MEM)
  if (!hasMatt && !hasMem) {
    return `Neither /${MATT} nor /${MEM} is installed.`
  }

  // Whatever is drafted in the prompt box becomes the next session's focus.
  const draft = (await $.prompt.read()).text.trim()
  if (draft) {
    await $.prompt.fill({ text: '' })
  }

  await update($, phase, () => 'running')
  armed = true
  try {
    // mattpocock's handoff can't be model-invoked, so it is the command that
    // runs; claude-mem's can, so the args ask the model to load it too.
    if (hasMatt) {
      await $.command.run({ command: MATT, args: combinedArgs(draft, hasMem ? MEM : null) })
    } else {
      await $.command.run({ command: MEM, args: combinedArgs(draft, null) })
    }
  } catch (error) {
    armed = false
    await update($, phase, () => 'idle')
    return `Handoff failed to start: ${error instanceof Error ? error.message : String(error)}`
  }
  return hasMatt && hasMem
    ? 'Writing combined handoff to HANDOFF.md...'
    : `Only one handoff skill is installed; running /${hasMatt ? MATT : MEM} alone.`
}

async function startFresh($: EngineInterface): Promise<void> {
  await update($, phase, () => 'idle')
  await $.command.run({ command: 'clear' })
  await $.prompt.fill({ text: RESUME })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'handoff-all',
      description: `Combined handoff (${MATT} + ${MEM}) into HANDOFF.md`,
      argumentHint: '[what the next session is for]',
    })
    return next(e)
  })

  on('command.run', { command: 'handoff-all' }, async ($, e) => {
    if (e.args.trim()) {
      await $.prompt.fill({ text: e.args.trim() })
    }
    return { text: await runHandoff($) }
  })

  on('turn.start', ($, e, next) => {
    if (armed) {
      armed = false
      handoffTurn = e.turnId
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.turnId === handoffTurn) {
      handoffTurn = null
      const ok = e.reason === 'answer'
      await update($, phase, () => (ok ? 'done' : 'idle'))
      $.ui.toast(ok ? 'Handoff written to HANDOFF.md' : 'Handoff turn did not finish')
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)
    const now = await read($, phase)

    if (now === 'running') {
      return (
        <Box gap={1}>
          <Text dimColor>Writing combined handoff...</Text>
          <Button key="reset" label="Reset" dimColor onPress={() => update($, phase, () => 'idle')} />
        </Box>
      )
    }

    if (now === 'done') {
      return (
        <Box gap={1}>
          <Text color="green">HANDOFF.md ready</Text>
          <Button key="fresh" label="Start fresh session" onPress={() => startFresh($)} />
          <Button key="dismiss" label="Dismiss" dimColor onPress={() => update($, phase, () => 'idle')} />
        </Box>
      )
    }

    return (
      <Box gap={1}>
        <Button
          key="handoff"
          label="Handoff"
          onPress={async () => {
            $.ui.toast(await runHandoff($))
          }}
        />
        <Text dimColor>prompt-box text becomes the next session's focus</Text>
      </Box>
    )
  })
}
