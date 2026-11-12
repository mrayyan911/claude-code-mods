import type { EngineInterface, Register } from 'claude-code'

type Pending = { title?: string; titledTurn: number; job?: Promise<void>; isRenamed?: boolean }

// Sessions with work since their last rename, by session id. A session with no
// entry is left alone at its end, so revisiting an old one never retitles it.
// shortcut: module memory, so a hot reload of this mod forgets work before it; persist in $.store if that bites.
const pending = new Map<string, Pending>()
let turns = 0

const DIGEST_CHARS = 24_000
// append-title.cjs exits with this when the session was named with /rename.
const RENAMED = 2
const PROMPT = `Below is a Claude Code session, oldest message first. Write a title of 3 to 7 words that sums up the work of the whole session, like a git commit subject. Reply with the title alone.`

export const digest = (lines: readonly string[]) => {
  const text = lines.join('\n')
  if (text.length <= DIGEST_CHARS) return text
  // Keep the opening ask and the latest work; the middle goes.
  return `${text.slice(0, DIGEST_CHARS / 4)}\n[...]\n${text.slice(-(DIGEST_CHARS * 3) / 4)}`
}

export const cleanTitle = (reply: string) =>
  (reply.trim().split('\n')[0] ?? '').replace(/^[\s"'`#*]+|[\s"'`*.]+$/g, '').slice(0, 80)

// Engine markup in user rows (reminders, slash-command echoes like /clear) is not the session's work.
const MARKUP = /<(system-reminder|local-command-caveat|local-command-stdout|command-name|command-message|command-args)>[\s\S]*?<\/\1>/g

export const toLine = (m: { role: string; text: string }) => `${m.role}: ${m.text.replace(MARKUP, '').trim().slice(0, 500)}`

const summarize = async ($: EngineInterface) => {
  const lines = (await $.session.messages()).map(toLine).filter(line => !line.endsWith(': '))
  if (lines.length === 0) return undefined
  const reply = await $.model.complete({
    model: 'haiku',
    effort: 'low',
    maxTokens: 40,
    timeoutMs: 30_000,
    prompt: `${PROMPT}\n\n<session>\n${digest(lines)}\n</session>`,
  })
  return reply.isAnswered ? cleanTitle(reply.text) || undefined : undefined
}

// The hooks module has no fs append, and $.fs.write would rewrite the whole transcript.
const script = ($: EngineInterface) => `${$.plugin.root}/hooks/append-title.cjs`
// live-title.cjs owns the title file's path, so the module needs no tmpdir.
const saveTitle = ($: EngineInterface, id: string, title: string) =>
  $.process.run(['node', `${$.plugin.root}/hooks/live-title.cjs`, id, title], { timeoutMs: 2000 })

const wasRenamed = async ($: EngineInterface, id: string) =>
  (await $.process.run(['node', script($), id], { timeoutMs: 5000 })).exitCode === RENAMED

const titleSession = async ($: EngineInterface, id: string, entry: Pending, turn: number) => {
  // A /rename never goes away, so one hit ends both the checks and the title calls for this session.
  entry.isRenamed ||= await wasRenamed($, id)
  if (entry.isRenamed) return
  const title = await summarize($)
  if (title === undefined || turn < entry.titledTurn) return
  entry.title = title
  entry.titledTurn = turn
  await saveTitle($, id, title)
  $.ui.log(`rename-session-mod: ${id} -> ${title}`, { to: 'debug' })
}

export const register: Register = on => {
  // A main-loop turn is the work. Not classic.Stop: the built-in security plugin sends classic.* past user mods.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    const id = await $.session.id()
    const turn = ++turns
    const entry = pending.get(id) ?? { titledTurn: 0 }
    pending.set(id, entry)
    // Title the session now, off the turn's path, so its end has nothing slow left to do.
    entry.job = titleSession($, id, entry, turn).catch(error =>
      $.ui.log(`rename-session-mod: no title: ${error}`, { to: 'debug' }),
    )
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    // After the engine's end step, so no metadata it re-appends lands after ours.
    const ended = await next(e)
    const entry = pending.get(e.sessionId)
    pending.delete(e.sessionId)
    if (entry === undefined || entry.isRenamed) return ended
    // A title still being written for the last turn gets what the exit's budget leaves, less room for the append.
    const waitMs = Math.min(1000, next.budget.remainingMs - 300)
    if (waitMs > 0) await Promise.race([entry.job, $.clock.sleep(waitMs)])
    if (entry.title === undefined) return ended
    // The same two rows /rename writes, so the name shows on resume.
    const line = [
      { type: 'custom-title', customTitle: entry.title, sessionId: e.sessionId },
      { type: 'agent-name', agentName: entry.title, sessionId: e.sessionId },
    ]
      .map(row => JSON.stringify(row))
      .join('\n')
    // The script checks for /rename once more: one run after the last turn is not seen above.
    const run = await $.process.run(['node', script($), e.sessionId, line], { timeoutMs: 1000 })
    if (run.exitCode === RENAMED) $.ui.log(`rename-session-mod: kept the /rename name of ${e.sessionId}`, { to: 'debug' })
    else if (run.exitCode !== 0) $.ui.log(`rename-session-mod: append failed: ${run.stderr}`, { to: 'debug' })
    return ended
  })
}
