import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const body = (await request.json()) as { password: string };

  if (!body.password || body.password.length < 6) {
    return NextResponse.json({ error: 'パスワードは6文字以上で入力してください' }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password: body.password });

  if (error) {
    return NextResponse.json({ error: 'パスワードの変更に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
