// Appends an auto title to a session's transcript, unless the person named that session with /rename.
// Usage: node append-title.cjs <session id> [custom-title JSON line]
// Exit 0 appended (or, with no line, not renamed), 1 no transcript found, 2 renamed with /rename.
const fs = require('fs')
const os = require('os')
const path = require('path')

const [id, line] = process.argv.slice(2)
const root = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects')
const dir = fs.readdirSync(root).find(d => fs.existsSync(path.join(root, d, `${id}.jsonl`)))
if (dir === undefined) {
  console.error(`no transcript for ${id}`)
  process.exit(1)
}
const file = path.join(root, dir, `${id}.jsonl`)

// The engine stamps `commandRun` on the row of a /rename the person ran, interactive or headless.
// A custom-title line alone is no proof: /clear carries the previous session's title over.
const RENAME = '"commandRun":{"command":"rename"'
const isRenameRow = text => {
  try {
    return JSON.parse(text).commandRun?.command === 'rename'
  } catch {
    return false
  }
}

if (fs.readFileSync(file, 'utf8').split('\n').some(text => text.includes(RENAME) && isRenameRow(text))) process.exit(2)
if (line !== undefined) fs.appendFileSync(file, `${line}\n`)
