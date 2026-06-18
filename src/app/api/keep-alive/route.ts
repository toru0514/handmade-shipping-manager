import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// Supabase 無料プランは 7 日間アクセスがないと一時停止する。
// Vercel Cron から定期的に軽量クエリを投げて停止を回避する。
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Vercel Cron からの呼び出しのみ許可する（CRON_SECRET が設定されている場合）。
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const supabase = createSupabaseAdminClient();
    // 行データは取得せず件数のみを問い合わせる軽量クエリ。
    const { error } = await supabase
      .from('orders')
      .select('order_id', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
  } catch (err) {
    console.error('keep-alive エラー:', err);
    return NextResponse.json(
      { ok: false, error: 'Supabase への疎通に失敗しました' },
      { status: 500 },
    );
  }
}
