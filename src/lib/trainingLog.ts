/**
 * Minimal browser-console triage for local dev (DevTools Console tab).
 * No secrets, passwords, cookies, or raw prompts.
 */

const PREFIX = "[TDG]";

function devOnly(): boolean {
  return import.meta.env.DEV;
}

/** Key local state transitions the learner may want to correlate with the API terminal. */
export function logFrontendInfo(event: string, details?: Record<string, unknown>): void {
  if (!devOnly()) {
    return;
  }
  if (details !== undefined) {
    console.info(PREFIX, event, details);
  } else {
    console.info(PREFIX, event);
  }
}

/** Expected API or connectivity failures during local testing. */
export function logFrontendDebug(event: string, details?: Record<string, unknown>): void {
  if (!devOnly()) {
    return;
  }
  if (details !== undefined) {
    console.debug(PREFIX, event, details);
  } else {
    console.debug(PREFIX, event);
  }
}
