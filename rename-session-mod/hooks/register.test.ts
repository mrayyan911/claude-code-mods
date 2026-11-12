import { expect, test } from 'claude-code/testing'
import { cleanTitle, digest, toLine } from './register'

import type { On } from 'claude-code'

const TURN = { answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as const
const END = { reason: 'prompt_input_exit', sessionId: 's1', resume: { id: 's1' } } as const

// Stands in for the engine; append-title.cjs answers `renamedExit` to a check (no title argument).
const engine = (on: On, sessionId: string, renamedExit: number) => {
  const seen = { appended: [] as unknown[], saved: [] as unknown[], forgotten: [] as unknown[], titleCalls: 0 }
  on('session.id', () => ({ value: sessionId }))
  on('session.messages', () => ({ value: [{ role: 'user', text: 'fix the login bug', toolUses: [] }] }))
  on('model.complete', () => {
    seen.titleCalls++
    return {
      value: {
        isAnswered: true,
        text: '"Fix login bug."',
        usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      },
    }
  })
  on('process.run', (_, e) => {
    const line = e.argv[3]
    const isSave = e.argv[1]?.endsWith('live-title.cjs') === true
    if (isSave && line === undefined) seen.forgotten.push(e.argv[2])
    else if (isSave) seen.saved.push({ id: e.argv[2], title: line })
    else if (line !== undefined) seen.appended.push({ id: e.argv[2], rows: line.split('\n').map(row => JSON.parse(row)) })
    const exitCode = line === undefined && !isSave ? renamedExit : 0
    return { value: { exitCode, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.log', () => ({ value: undefined }))
  return seen
}

// The test runtime has it; the hooks environment's types leave it out.
declare const setTimeout: (callback: () => void, ms: number) => unknown

// The kit's clock ends the exit's wait at once, so let the turn's title job finish first, as a person's pause would.
const settle = () => new Promise<void>(resolve => setTimeout(resolve, 20))

test('a session named with /rename gets no title call and no title', async ($, on) => {
  const seen = engine(on, 's2', 2)

  await $.turn.complete(TURN)
  await $.turn.complete(TURN)
  await settle()
  await $.session.end({ ...END, sessionId: 's2' })

  expect(seen.titleCalls).toBe(0)
  expect(seen.appended).toEqual([])
  expect(seen.saved).toEqual([])
  // A title saved before a mid-session /rename still goes.
  expect(seen.forgotten).toEqual(['s2'])
})

test('a session is renamed at its end only when it had work since the last rename', async ($, on) => {
  const { appended, saved, forgotten } = engine(on, 's1', 0)

  // Revisiting with no work: nothing written.
  await $.session.end(END)
  expect(appended).toEqual([])
  expect(forgotten).toEqual([])

  // A subagent's turn is not the session's work.
  await $.turn.complete({ ...TURN, agentId: 'a1' })
  await $.session.end(END)
  expect(appended).toEqual([])

  await $.turn.complete(TURN)
  await settle()
  await $.session.end(END)
  expect(saved).toEqual([{ id: 's1', title: 'Fix login bug' }])
  expect(forgotten).toEqual(['s1'])
  expect(appended).toEqual([
    {
      id: 's1',
      rows: [
        { type: 'custom-title', customTitle: 'Fix login bug', sessionId: 's1' },
        { type: 'agent-name', agentName: 'Fix login bug', sessionId: 's1' },
      ],
    },
  ])

  // Ended again with no new turn: not renamed again.
  await $.session.end(END)
  expect(appended).toHaveLength(1)
  expect(forgotten).toHaveLength(1)
})

test('titles are one clean line and long sessions keep both ends', () => {
  expect(cleanTitle('  **Add search page**\nextra')).toBe('Add search page')
  expect(toLine({ role: 'user', text: '<command-name>/clear</command-name>\n<command-message>clear</command-message>' })).toBe('user: ')
  const text = digest(['user: first ask', 'x'.repeat(30_000), 'assistant: last answer'])
  expect(text.startsWith('user: first ask')).toBe(true)
  expect(text.endsWith('assistant: last answer')).toBe(true)
  expect(text.length).toBeLessThan(25_000)
})
