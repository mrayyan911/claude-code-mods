// Appends an auto title to a session's transcript, unless the person named that session with /rename.
// Usage: node append-title.cjs <session id> [JSON lines to append, newline-separated]
// Exit 0 appended (or, with no line, not renamed), 1 no transcript found, 2 renamed with /rename.
const fs = require('fs')
const { findTranscript, isRenamed } = require('./transcript.cjs')

const [id, line] = process.argv.slice(2)
const file = findTranscript(id)
if (file === undefined) {
  console.error(`no transcript for ${id}`)
  process.exit(1)
}

if (isRenamed(file)) process.exit(2)
if (line !== undefined) fs.appendFileSync(file, `${line}\n`)
