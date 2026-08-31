import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Footfall and engagement beacons — spec §11.
 *
 * Both are mandatory and both carry ZERO personal data. The footfall beacon
 * fires on app open, before consent exists; without it, footfall would
 * silently mean "completed conversations", understating the headline metric
 * by every abandonment.
 *
 * Fire-and-forget from the client via `sendBeacon`, never retried. An
 * occasional loss slightly understates a headline count, which is accepted.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BeaconBody {
  type?: unknown;
  sessionId?: unknown;
  userAgent?: unknown;
  source?: unknown;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: BeaconBody;
  try {
    body = (await request.json()) as BeaconBody;
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!UUID.test(sessionId)) {
    return NextResponse.json({ error: 'bad session id' }, { status: 400 });
  }

  const type = body.type === 'engagement' ? 'engagement' : 'footfall';
  const source = body.source === 'tablet' ? 'tablet' : 'nfc';
  const userAgent =
    typeof body.userAgent === 'string'
      ? body.userAgent.slice(0, 512)
      : (request.headers.get('user-agent') ?? '').slice(0, 512);

  const db = supabaseAdmin();

  if (type === 'footfall') {
    // On conflict do nothing: a re-fired footfall beacon must not restart
    // the clock on a session already counted.
    const { error } = await db
      .from('sessions')
      .upsert(
        {
          session_id: sessionId,
          tapped_at: new Date().toISOString(),
          user_agent: userAgent,
          source,
        },
        { onConflict: 'session_id', ignoreDuplicates: true },
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Engagement. The session row should already exist; if the footfall
  // beacon was lost, insert it rather than dropping the engagement.
  const stamp = new Date().toISOString();
  const { data, error } = await db
    .from('sessions')
    .update({ engaged_at: stamp })
    .eq('session_id', sessionId)
    .is('engaged_at', null)
    .select('session_id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    // Either already engaged (fine — leave the first timestamp alone) or
    // the session was never recorded.
    const { error: insertError } = await db.from('sessions').upsert(
      {
        session_id: sessionId,
        tapped_at: stamp,
        engaged_at: stamp,
        user_agent: userAgent,
        source,
      },
      { onConflict: 'session_id', ignoreDuplicates: true },
    );
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
