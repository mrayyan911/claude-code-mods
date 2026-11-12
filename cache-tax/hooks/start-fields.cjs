// SessionStart command hook. classic.SessionStart never reaches register.ts on a machine where
// cc-plugin-sec-default sends it past user-tier plugins, but a plugin's command hook still runs.
// So this saves a resume or fork's fields to state/<session id>.json, where register.ts reads them.
// A hook must never fail the session, so every error exits 0 silently.
const fs = require('fs')
const path = require('path')

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const dir = path.join(__dirname, '..', 'state')

const prune = now => {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name)
    if (now - fs.statSync(file).mtimeMs > WEEK_MS) fs.rmSync(file, { force: true })
  }
}

try {
  const e = JSON.parse(fs.readFileSync(0, 'utf8'))
  if ((e.source === 'resume' || e.source === 'fork') && /^[\w-]+$/.test(e.session_id)) {
    fs.mkdirSync(dir, { recursive: true })
    const { source, model, context_tokens, seconds_since_last_response, prompt_cache_likely_expired, estimated_cache_write_usd } = e
    fs.writeFileSync(path.join(dir, `${e.session_id}.json`), JSON.stringify({ at: Date.now(), source, model, context_tokens, seconds_since_last_response, prompt_cache_likely_expired, estimated_cache_write_usd }))
    prune(Date.now())
  }
} catch {}
