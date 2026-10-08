/** idle: button shown; running: handoff turn queued or in progress; done: HANDOFF.md written. */
export type Phase = 'idle' | 'running' | 'done'

declare module 'claude-code' {
  interface PluginState {
    'handoff-button': { phase: Phase }
  }
}
