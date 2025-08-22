// Supabase Edge Function: admin-create-user
// POST { email: string, password?: string, first_name?: string, last_name?: string, role?: 'admin' | 'user' }
// Requires caller to be super_admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, init: number | ResponseInit = 200) {
  const base = typeof init === 'number' ? { status: init } : init;
  return new Response(JSON.stringify(data), {
    ...base,
    headers: {
      'content-type': 'application/json',
      ...CORS_HEADERS,
      ...(base?.headers ?? {}),
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const supa = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supa.auth.getUser();
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supa
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      return json({ error: 'Forbidden: requires super_admin' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '').trim() || undefined;
    const first_name = String(body?.first_name || '').trim() || undefined;
    const last_name = String(body?.last_name || '').trim() || undefined;
    const role = (String(body?.role || 'admin').trim() as 'admin' | 'user');

    if (!email) return json({ error: 'Missing email' }, 400);

    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });

    if (createErr || !created?.user) {
      return json({ error: createErr?.message || 'Failed to create user' }, 400);
    }

    // Ensure profile row and set role
    const { error: upsertErr } = await service
      .from('profiles')
      .upsert({ user_id: created.user.id, first_name, last_name, role }, { onConflict: 'user_id' });

    if (upsertErr) {
      return json({ error: upsertErr.message }, 400);
    }

    return json({ ok: true, user_id: created.user.id, email, role });
  } catch (err) {
    console.error('admin-create-user error', err);
    return json({ error: String(err?.message || err) }, 500);
  }
});