// Run with: node --test hooks/append-title.test.cjs
const assert = require('node:assert')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

const SCRIPT = path.join(__dirname, 'append-title.cjs')
const TITLE = JSON.stringify({ type: 'custom-title', customTitle: 'Auto title', sessionId: 's1' })

const RENAMED = [
  { type: 'user', message: { role: 'user', content: '<command-name>/rename</command-name>\n<command-args>Mine</command-args>' } },
  { type: 'system', subtype: 'local_command', content: 'Session renamed to: Mine', commandRun: { command: 'rename', args: 'Mine' } },
  { type: 'custom-title', customTitle: 'Mine', sessionId: 's1' },
]

const run = (rows, args = [TITLE]) => {
  const config = fs.mkdtempSync(path.join(os.tmpdir(), 'rename-session-mod-'))
  const file = path.join(config, 'projects', 'D--proj', 's1.jsonl')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, rows.map(row => `${JSON.stringify(row)}\n`).join(''))
  const { status } = spawnSync(process.execPath, [SCRIPT, 's1', ...args], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: config },
  })
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n')
  fs.rmSync(config, { recursive: true, force: true })
  return { status, lines }
}

test('a session never renamed by hand gets the auto title, even with a title /clear carried over', () => {
  const { status, lines } = run([
    { type: 'custom-title', customTitle: 'Carried over by /clear', sessionId: 's1' },
    { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', content: '<command-name>/rename</command-name>' }] } },
  ])
  assert.equal(status, 0)
  assert.equal(lines.at(-1), TITLE)
})

test('a session named with /rename keeps its name', () => {
  const { status, lines } = run(RENAMED)
  assert.equal(status, 2)
  assert.equal(lines.length, 3)
  assert.ok(!lines.includes(TITLE))
})

test('with no title it only checks: 2 for a /rename session, 0 otherwise, and writes nothing', () => {
  const renamed = run(RENAMED, [])
  assert.equal(renamed.status, 2)
  assert.equal(renamed.lines.length, 3)
  const plain = run([{ type: 'user', message: { role: 'user', content: 'hi' } }], [])
  assert.equal(plain.status, 0)
  assert.equal(plain.lines.length, 1)
})
