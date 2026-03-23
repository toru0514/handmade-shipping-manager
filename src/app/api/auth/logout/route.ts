import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const response = NextResponse.json({ ok: true });
  response.cookies.set('remember_me', '', { path: '/', maxAge: 0 });
  return response;
}
