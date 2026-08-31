/**
 * Read back the most recent sessions and leads, for smoke-testing capture.
 *
 * Spec §15's smoke test ends "one end-to-end session landing a real lead,
 * then delete that test lead". Pass --delete <session_id> to do the second
 * half: test data must not survive into a table of real prospects.
 *
 *   node scripts/inspect-lead.mjs
 *   node scripts/inspect-lead.mjs --delete <session_id>
 *
 * Talks to PostgREST directly rather than through `supabase-js`, which
 * constructs a Realtime client eagerly and throws on Node 20 for want of a
 * native WebSocket. Next's server runtime polyfills that; a plain script
 * has no such luck, and a diagnostic tool should not need a dependency to
 * read five rows.
 */

import { readFileSync } from 'node:fs';

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (match) process.env[match[1]] ??= match[2].trim();
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

async function rest(path, init = {}) {
  const response = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${path}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

const deleteIndex = process.argv.indexOf('--delete');
if (deleteIndex !== -1) {
  const sessionId = process.argv[deleteIndex + 1];
  if (!sessionId) throw new Error('--delete needs a session id');

  await rest(`leads?session_id=eq.${sessionId}`, { method: 'DELETE' });
  // The session row carries no personal data, but a smoke test should not
  // inflate footfall either.
  await rest(`sessions?session_id=eq.${sessionId}`, { method: 'DELETE' });

  console.log(`deleted lead and session ${sessionId}`);
  process.exit(0);
}

const sessions = await rest(
  'sessions?select=session_id,tapped_at,engaged_at,source' +
    '&order=tapped_at.desc&limit=5',
);

console.log('\nsessions (newest first)');
console.table(
  sessions.map((s) => ({
    session: s.session_id.slice(0, 8),
    tapped: s.tapped_at?.slice(11, 19),
    engaged: s.engaged_at ? s.engaged_at.slice(11, 19) : '—',
    source: s.source,
  })),
);

const leads = await rest('leads?select=*&order=submitted_at.desc&limit=5');

console.log('\nleads (newest first)');
console.table(
  leads.map((lead) => ({
    band: lead.band,
    score: lead.final_score,
    name: lead.full_name,
    company: lead.company_name,
    need: lead.need,
    bu: lead.primary_bu,
    cta: lead.cta_action,
    incomplete: lead.is_incomplete,
    phone_ok: lead.consent_phone_given,
  })),
);

const newest = leads[0];
if (newest) {
  console.log('\nnewest lead, scoring breakdown');
  console.log(
    `  need ${newest.need_points} + timeline ${newest.timeline_points} + ` +
      `intent ${newest.intent_points} + influence ` +
      `${newest.influence_points} + fit ${newest.fit_points} = provisional ` +
      `${newest.provisional_score}`,
  );
  console.log(
    `  + engagement ${newest.engagement_points} = final ` +
      `${newest.final_score} (${newest.band}), scoring ` +
      `${newest.scoring_version}, consent ${newest.consent_version}`,
  );
  console.log(`  phone stored: ${newest.phone ?? '(none)'}`);
  console.log(`  session ${newest.session_id}`);
}
