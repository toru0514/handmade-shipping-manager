import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: '設定の取得に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({
    email: user.email,
    slackWebhookUrl: data?.slack_webhook_url ?? '',
    slackEnabled: data?.slack_enabled ?? false,
  });
}

export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const body = (await request.json()) as { slackWebhookUrl?: string; slackEnabled?: boolean };

  const { error } = await supabase.from('user_settings').upsert(
    {
      user_id: user.id,
      slack_webhook_url: body.slackWebhookUrl ?? '',
      slack_enabled: body.slackEnabled ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    return NextResponse.json({ error: '設定の保存に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
