import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CURRENT_CONSENT, validateCheckin } from '@/domain/checkin';
import { routeFor } from '@/domain/routing';
import { emailDomain, isCorporateDomain, scoreSubmission } from '@/domain/scoring';
import type { CheckinDetails, SubmitPayload } from '@/domain/types';

/**
 * Lead intake — spec §11. The single POST, fired at the CTA.
 *
 * No lead row exists until the visitor reaches the end. Nothing is written
 * on check-in and nothing is PATCHed per node: a closed tab mid-tree is
 * *meant* to leave nothing behind.
 *
 * The client sends answers, not scores. Scoring and routing are recomputed
 * here from the same pure functions the client used to pick the CTA, so a
 * tampered or stale payload cannot write its own band.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CTA_ACTIONS = new Set(['bu_follow_up', 'send_info', 'explore']);
const ROLES = new Set([
  'owner_c_suite_director',
  'manager_finance',
  'executive_analyst_other',
]);

/** Queued payloads expire 7 days after they were written (spec §11). */
const QUEUE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function badRequest(reason: string) {
  return NextResponse.json({ error: reason }, { status: 400 });
}

export async function POST(request: Request) {
  let payload: SubmitPayload;
  try {
    payload = (await request.json()) as SubmitPayload;
  } catch {
    return badRequest('bad json');
  }

  if (!payload?.sessionId || !UUID.test(payload.sessionId)) {
    return badRequest('bad session id');
  }
  if (!CTA_ACTIONS.has(payload.ctaAction)) {
    return badRequest('bad cta action');
  }
  if (!payload.checkin || !ROLES.has(payload.checkin.role)) {
    return badRequest('bad role');
  }

  const checkin: CheckinDetails = {
    fullName: String(payload.checkin.fullName ?? '').trim().slice(0, 200),
    companyName: String(payload.checkin.companyName ?? '').trim().slice(0, 200),
    companyEmail: String(payload.checkin.companyEmail ?? '').trim().slice(0, 320),
    role: payload.checkin.role,
    phone:
      typeof payload.checkin.phone === 'string' &&
      payload.checkin.phone.trim() !== ''
        ? payload.checkin.phone.trim().slice(0, 40)
        : null,
    consentPurpose: payload.checkin.consentPurpose === true,
    consentPhone: payload.checkin.consentPhone === true,
  };

  // Consent gates the write. This is the same check the Submit button runs
  // on the device; it is repeated here because the gate must be structural.
  const validation = validateCheckin(checkin);
  if (!validation.canSubmit) {
    return NextResponse.json(
      { error: 'consent or validation failed', fields: validation.errors },
      { status: 422 },
    );
  }

  // A payload that sat in a phone's queue past its expiry is dropped rather
  // than written: holding personal data on a stranger's phone indefinitely
  // contradicts the retention position, and so does honouring it late.
  const queuedAt = Date.parse(payload.queuedAt ?? '');
  if (Number.isFinite(queuedAt) && Date.now() - queuedAt > QUEUE_MAX_AGE_MS) {
    return NextResponse.json({ ok: true, dropped: 'expired' }, { status: 200 });
  }

  const answers = {
    interest: payload.answers?.interest ?? null,
    need: payload.answers?.need ?? null,
    timeline: payload.answers?.timeline ?? null,
    intent: payload.answers?.intent ?? null,
  };

  const score = scoreSubmission(
    { answers, role: checkin.role, companyEmail: checkin.companyEmail },
    payload.ctaAction,
  );
  const route = routeFor(answers.need);
  const domain = emailDomain(checkin.companyEmail);

  const db = supabaseAdmin();

  // The wording lives once, under a version. Insert-only: if this version
  // is already recorded, leave it exactly as it is.
  await db
    .from('consent_versions')
    .upsert(CURRENT_CONSENT, { onConflict: 'version', ignoreDuplicates: true });

  // The session row may be missing if the footfall beacon was lost, and the
  // lead's FK needs it. Never overwrite an existing row.
  await db.from('sessions').upsert(
    {
      session_id: payload.sessionId,
      tapped_at: new Date().toISOString(),
      user_agent: (request.headers.get('user-agent') ?? '').slice(0, 512),
      source: payload.source === 'tablet' ? 'tablet' : 'nfc',
    },
    { onConflict: 'session_id', ignoreDuplicates: true },
  );

  const row = {
    session_id: payload.sessionId,
    submitted_at: new Date().toISOString(),

    full_name: checkin.fullName,
    company_name: checkin.companyName,
    company_email: checkin.companyEmail,
    role: checkin.role,
    phone: checkin.phone,

    email_domain: domain,
    is_corporate_domain: isCorporateDomain(domain),

    interest: answers.interest,
    need: answers.need,
    timeline: answers.timeline,
    intent: answers.intent,

    need_points: score.breakdown.needPoints,
    timeline_points: score.breakdown.timelinePoints,
    intent_points: score.breakdown.intentPoints,
    influence_points: score.breakdown.influencePoints,
    fit_points: score.breakdown.fitPoints,
    provisional_score: score.provisionalScore,
    engagement_points: score.engagementPoints,
    final_score: score.finalScore,
    band: score.band,
    scoring_version: score.scoringVersion,

    cta_action: payload.ctaAction,
    cta_wording_shown: String(payload.ctaWordingShown ?? '').slice(0, 120),

    primary_bu: route.primary,
    secondary_bu: route.secondary,

    is_incomplete: score.isIncomplete,

    consent_version: CURRENT_CONSENT.version,
    consent_purpose_given: checkin.consentPurpose,
    consent_phone_given: checkin.consentPhone,
    consent_at: payload.consentAt ?? new Date().toISOString(),
  };

  const { error } = await db.from('leads').insert(row);

  if (error) {
    // 23505 — the session already has a lead. The offline queue can deliver
    // the same payload twice; that is a success, not a failure, and must
    // not cause the phone to retry forever.
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
