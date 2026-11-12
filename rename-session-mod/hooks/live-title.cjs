// Keeps the auto title as the session's live name. Two modes:
//   node live-title.cjs <session id> <title>   save the title (called by register.ts)
//   node live-title.cjs  (hook JSON on stdin)  print it as sessionTitle, unless the person used /rename
// A hook must never fail the prompt, so every error exits 0 silently.
const fs = require('fs')
const os = require('os')
const path = require('path')
const { findTranscript, isRenamed } = require('./transcript.cjs')

const titleFile = id => path.join(os.tmpdir(), 'rename-session-mod', `${id}.txt`)

try {
  const [id, title] = process.argv.slice(2)
  if (id !== undefined) {
    // shortcut: title files in os.tmpdir() are never cleaned up, delete them at session.end if they pile up
    fs.mkdirSync(path.dirname(titleFile(id)), { recursive: true })
    fs.writeFileSync(titleFile(id), title ?? '')
  } else {
    const { session_id, hook_event_name } = JSON.parse(fs.readFileSync(0, 'utf8'))
    const sessionTitle = fs.readFileSync(titleFile(session_id), 'utf8')
    const transcript = findTranscript(session_id)
    if (sessionTitle && !(transcript !== undefined && isRenamed(transcript))) {
      console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: hook_event_name, sessionTitle } }))
    }
  }
} catch {}
