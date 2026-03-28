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

  const body = (await request.json()) as { email: string };

  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: '有効なメールアドレスを入力してください' }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ email: body.email });

  if (error) {
    return NextResponse.json({ error: 'メールアドレスの更新に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
