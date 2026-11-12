const { test } = require('node:test')
const assert = require('node:assert')
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const script = path.join(__dirname, 'start-fields.cjs')
const fileOf = id => path.join(__dirname, '..', 'state', `${id}.json`)
const run = input => execFileSync(process.execPath, [script], { input: typeof input === 'string' ? input : JSON.stringify(input) })

test('a resume saves its fields under the session id', () => {
  const id = `test-${process.pid}-resume`
  try {
    run({ session_id: id, source: 'resume', context_tokens: 200000, seconds_since_last_response: 7200, prompt_cache_likely_expired: true, cwd: '/work' })
    const saved = JSON.parse(fs.readFileSync(fileOf(id), 'utf8'))
    assert.equal(saved.source, 'resume')
    assert.equal(saved.context_tokens, 200000)
    assert.equal(saved.seconds_since_last_response, 7200)
    assert.equal(typeof saved.at, 'number')
    assert.equal(saved.cwd, undefined)
  } finally {
    fs.rmSync(fileOf(id), { force: true })
  }
})

test('a startup, a clear or a bad session id saves nothing, and bad input exits 0', () => {
  for (const source of ['startup', 'clear']) {
    const id = `test-${process.pid}-${source}`
    run({ session_id: id, source })
    assert.equal(fs.existsSync(fileOf(id)), false)
  }
  run({ session_id: '../escape', source: 'resume' })
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'escape.json')), false)
  run('not json')
})
