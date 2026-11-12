// Run with: node --test hooks/live-title.test.cjs
const assert = require('node:assert')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

const SCRIPT = path.join(__dirname, 'live-title.cjs')

const setup = rows => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rename-session-mod-'))
  const file = path.join(dir, 'config', 'projects', 'D--proj', 's1.jsonl')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, rows.map(row => `${JSON.stringify(row)}\n`).join(''))
  const env = { ...process.env, CLAUDE_CONFIG_DIR: path.join(dir, 'config'), TMP: dir, TEMP: dir, TMPDIR: dir }
  const run = (args, input) => spawnSync(process.execPath, [SCRIPT, ...args], { env, input })
  return { dir, run }
}
const hook = event => JSON.stringify({ session_id: 's1', hook_event_name: event })
const RENAMED = [{ type: 'system', commandRun: { command: 'rename', args: 'Mine' } }]

test('a saved title comes back as sessionTitle for the hook event that asked', () => {
  const { dir, run } = setup([])
  assert.equal(run(['s1', 'Fix login bug']).status, 0)
  for (const event of ['UserPromptSubmit', 'SessionStart']) {
    const out = run([], hook(event))
    assert.equal(out.status, 0)
    assert.deepEqual(JSON.parse(out.stdout), { hookSpecificOutput: { hookEventName: event, sessionTitle: 'Fix login bug' } })
  }
  fs.rmSync(dir, { recursive: true, force: true })
})

test('no saved title prints nothing', () => {
  const { dir, run } = setup([])
  const out = run([], hook('UserPromptSubmit'))
  assert.equal(out.status, 0)
  assert.equal(out.stdout.length, 0)
  fs.rmSync(dir, { recursive: true, force: true })
})

test('a /rename in the transcript silences the hook', () => {
  const { dir, run } = setup(RENAMED)
  run(['s1', 'Fix login bug'])
  const out = run([], hook('UserPromptSubmit'))
  assert.equal(out.status, 0)
  assert.equal(out.stdout.length, 0)
  fs.rmSync(dir, { recursive: true, force: true })
})

test('bad stdin exits 0 with no output', () => {
  const { dir, run } = setup([])
  const out = run([], 'not json')
  assert.equal(out.status, 0)
  assert.equal(out.stdout.length, 0)
  fs.rmSync(dir, { recursive: true, force: true })
})
