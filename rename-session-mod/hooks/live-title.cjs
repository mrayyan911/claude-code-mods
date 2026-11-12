// Keeps the auto title as the session's live name. Three modes:
//   node live-title.cjs <session id> <title>   save the title (called by register.ts after each titled turn)
//   node live-title.cjs <session id>           delete the saved title (called by register.ts at session.end)
//   node live-title.cjs  (hook JSON on stdin)  print it as sessionTitle, unless the person used /rename
// A hook must never fail the prompt, so every error exits 0 silently.
const fs = require('fs')
const os = require('os')
const path = require('path')
const { findTranscript, isRenamed } = require('./transcript.cjs')

const titleFile = id => path.join(os.tmpdir(), 'rename-session-mod', `${id}.txt`)

const lastTitle = transcript => {
  const rows = fs.readFileSync(transcript, 'utf8').split('\n')
  for (let i = rows.length - 1; i >= 0; i--) {
    if (!rows[i].includes('"type":"custom-title"')) continue
    try {
      return JSON.parse(rows[i]).customTitle
    } catch {}
  }
}

const hook = () => {
  const { session_id, hook_event_name, source } = JSON.parse(fs.readFileSync(0, 'utf8'))
  const transcript = findTranscript(session_id)
  if (transcript !== undefined && isRenamed(transcript)) return
  const saved = fs.existsSync(titleFile(session_id)) ? fs.readFileSync(titleFile(session_id), 'utf8') : ''
  // The title file is deleted at session.end, so a resumed session takes the title its end wrote to the transcript.
  const sessionTitle = saved || (source === 'resume' && transcript !== undefined ? lastTitle(transcript) : undefined)
  if (sessionTitle) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: hook_event_name, sessionTitle } }))
}

try {
  const [id, title] = process.argv.slice(2)
  if (id === undefined) hook()
  else if (title === undefined) fs.rmSync(titleFile(id), { force: true })
  else {
    fs.mkdirSync(path.dirname(titleFile(id)), { recursive: true })
    fs.writeFileSync(titleFile(id), title)
  }
} catch {}
