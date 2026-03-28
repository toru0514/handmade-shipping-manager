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

  const rawUrl: string = data?.slack_webhook_url ?? '';
  let maskedUrl = '';
  if (rawUrl) {
    // https://hooks.slack.com/services/T.../B.../... → https://hooks.slack.com/services/T****/B****/****
    const prefix = 'https://hooks.slack.com/services/';
    if (rawUrl.startsWith(prefix)) {
      const segments = rawUrl.slice(prefix.length).split('/');
      maskedUrl = prefix + segments.map((s) => (s.length > 1 ? s[0] + '****' : '****')).join('/');
    } else {
      maskedUrl = rawUrl.slice(0, 12) + '****';
    }
  }

  return NextResponse.json({
    email: user.email,
    slackWebhookUrl: maskedUrl,
    slackWebhookUrlSet: rawUrl.length > 0,
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

  // Only update webhook URL if a non-empty value is provided (avoid overwriting with empty string)
  const upsertData: Record<string, unknown> = {
    user_id: user.id,
    slack_enabled: body.slackEnabled ?? false,
    updated_at: new Date().toISOString(),
  };
  if (body.slackWebhookUrl && body.slackWebhookUrl.trim().length > 0) {
    upsertData.slack_webhook_url = body.slackWebhookUrl.trim();
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert(upsertData, { onConflict: 'user_id' });

  if (error) {
    return NextResponse.json({ error: '設定の保存に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
