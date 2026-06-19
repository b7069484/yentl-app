#!/usr/bin/env node
/**
 * Agent-to-agent notify — append a message to the shared mailbox, lock-safe.
 * Portable kit (see PROTOCOL.md). Default mailbox: agent-comms/mailbox.json (override with --mailbox).
 * Usage:
 *   node notify.mjs --from claude --to codex --body "..." [--thread t] [--token X] [--reply-to MSG-xxxx] [--mailbox path]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmdirSync, statSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';

const a = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[i + 1];
const mailbox = a.mailbox || 'agent-comms/mailbox.json';
const { from, to, body } = a;
if (!from || !to || !body) {
  console.error('usage: notify.mjs --from <agent> --to <agent> --body "..." [--thread t] [--token x] [--reply-to id] [--mailbox path]');
  process.exit(2);
}
try { mkdirSync(dirname(mailbox), { recursive: true }); } catch {}
const lock = mailbox + '.lock';
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

await (async function withLock(fn) {
  for (let i = 0; i < 50; i++) {
    try {
      try { if (Date.now() - statSync(lock).mtimeMs > 10000) rmdirSync(lock); } catch {}
      mkdirSync(lock);
      try { return fn(); } finally { try { rmdirSync(lock); } catch {} }
    } catch (e) { if (e.code !== 'EEXIST') throw e; sleep(100); }
  }
  throw new Error('could not acquire mailbox lock: ' + lock);
})(() => {
  const mb = existsSync(mailbox)
    ? JSON.parse(readFileSync(mailbox, 'utf8'))
    : { channel: 'agent-comms', version: 1, note: 'Append-only agent<->agent mailbox. Read with inbox.mjs.', messages: [] };
  const msg = {
    id: 'MSG-' + randomUUID().slice(0, 8), from, to,
    thread: a.thread || 'general', ts: new Date().toISOString(),
    ...(a['reply-to'] ? { reply_to: a['reply-to'] } : {}),
    ...(a.token ? { token: a.token } : {}),
    body, read_by: [],
  };
  mb.messages.push(msg);
  mb.updatedAt = new Date().toISOString();
  writeFileSync(mailbox, JSON.stringify(mb, null, 2) + '\n');
  console.log(`sent ${msg.id}  ${from} -> ${to}  [${msg.thread}]`);
});
