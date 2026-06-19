#!/usr/bin/env node
/**
 * Agent inbox — read unread messages addressed to an agent, optionally mark read.
 * Portable kit (see PROTOCOL.md). Default mailbox: agent-comms/mailbox.json (override with --mailbox).
 * Usage:
 *   node inbox.mjs --agent claude [--mark-read] [--all] [--mailbox path]
 * Run at the start of every turn to pull what the other agent sent — no human relay.
 * Exit code 10 if there are unread messages (so a hook/loop can detect "you have mail").
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmdirSync, statSync } from 'node:fs';

const a = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
const mailbox = a.mailbox && a.mailbox !== true ? a.mailbox : 'agent-comms/mailbox.json';
const agent = a.agent;
if (!agent || agent === true) { console.error('usage: inbox.mjs --agent <name> [--mark-read] [--all] [--mailbox path]'); process.exit(2); }
if (!existsSync(mailbox)) { console.log(`(no mailbox at ${mailbox} yet — inbox empty)`); process.exit(0); }

const mb = JSON.parse(readFileSync(mailbox, 'utf8'));
const all = a.all === true;
// --exclude-thread <substr>: never read/consume messages whose thread matches (keeps multi-project loops from stealing each other's mail)
const excludeThread = a['exclude-thread'] && a['exclude-thread'] !== true ? String(a['exclude-thread']).toLowerCase() : null;
const notExcluded = (m) => !excludeThread || !String(m.thread || '').toLowerCase().includes(excludeThread);
const mine = mb.messages.filter((m) => m.to === agent && notExcluded(m) && (all || !(m.read_by || []).includes(agent)));

if (mine.length === 0) { console.log(`inbox(${agent}): no ${all ? '' : 'unread '}messages.`); process.exit(0); }

console.log(`inbox(${agent}): ${mine.length} ${all ? '' : 'unread '}message(s)\n`);
for (const m of mine) {
  console.log(`  ${m.id}  from ${m.from}  [${m.thread}]  ${m.ts}${m.reply_to ? '  re:' + m.reply_to : ''}`);
  if (m.token) console.log(`     token: ${m.token}`);
  console.log(`     ${m.body}\n`);
}

if (a['mark-read'] === true) {
  const lock = mailbox + '.lock';
  const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  for (let i = 0; i < 50; i++) {
    try {
      try { if (Date.now() - statSync(lock).mtimeMs > 10000) rmdirSync(lock); } catch {}
      mkdirSync(lock);
      try {
        const fresh = JSON.parse(readFileSync(mailbox, 'utf8'));
        for (const m of fresh.messages) if (m.to === agent && notExcluded(m) && !(m.read_by || []).includes(agent)) (m.read_by ||= []).push(agent);
        fresh.updatedAt = new Date().toISOString();
        writeFileSync(mailbox, JSON.stringify(fresh, null, 2) + '\n');
      } finally { try { rmdirSync(lock); } catch {} }
      break;
    } catch (e) { if (e.code !== 'EEXIST') throw e; sleep(100); }
  }
  console.log(`(marked ${mine.length} read for ${agent})`);
}
process.exit(10); // signal: had messages
