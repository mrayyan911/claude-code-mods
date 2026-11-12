// Shared by append-title.cjs and live-title.cjs: find a session's transcript and tell whether /rename named it.
const fs = require('fs')
const os = require('os')
const path = require('path')

const root = () => path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects')

const findTranscript = id => {
  const dir = fs.readdirSync(root()).find(d => fs.existsSync(path.join(root(), d, `${id}.jsonl`)))
  return dir === undefined ? undefined : path.join(root(), dir, `${id}.jsonl`)
}

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

const isRenamed = file => fs.readFileSync(file, 'utf8').split('\n').some(text => text.includes(RENAME) && isRenameRow(text))

module.exports = { findTranscript, isRenamed }
