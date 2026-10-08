import { expect, test } from 'claude-code/testing'

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, width: 80 },
} as const

test('the band shows a Handoff button on every surface that has one', async $ => {
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'rayyan-handoff-button', surface, ...BAND } as never)
    expect(await ui.find({ key: 'handoff' })).toBeDefined()
    await ui.unmount()
  }
})

test('one click runs mattpocock handoff with claude-mem folded in', async ($, on) => {
  const runs: { command: string; args: string }[] = []
  const fills: string[] = []
  on('command.list', () => ({
    value: ['mattpocock-skills:handoff', 'claude-mem:handoff'].map(name => ({ name, description: '', source: 'plugin' })),
  }) as never)
  on('prompt.read', () => ({ value: { text: '  fix the sitemap  ', cursor: 0 } }))
  on('prompt.fill', ($, e) => {
    fills.push(e.text)
    return { isFilled: true } as never
  })
  on('command.run', ($, e) => {
    runs.push({ command: e.command, args: e.args })
    return { text: '' }
  })

  const ui = await $.ui.mount({ plugin: 'rayyan-handoff-button', surface: 'terminal', ...BAND } as never)
  await ui.press({ key: 'handoff' })

  expect(runs.length).toBe(1)
  expect(runs[0]?.command).toBe('mattpocock-skills:handoff')
  expect(runs[0]?.args).toContain('claude-mem:handoff')
  expect(runs[0]?.args).toContain('HANDOFF.md')
  expect(runs[0]?.args).toContain('Next session focus: fix the sitemap.')
  expect(fills).toEqual([''])
  expect(await ui.find({ key: 'handoff' })).toBeUndefined()
  await ui.unmount()
})
