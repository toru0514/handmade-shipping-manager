import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

/**
 * 出品管理（PFA）用の Supabase クライアントを取得する。
 * Service Role Key で直接アクセスするサーバー専用クライアント。
 * 環境変数が未設定の場合は null を返す（Supabase 未導入環境でも動作可能）。
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

/**
 * Supabase が利用可能かどうかを返す。
 */
export function isSupabaseEnabled(): boolean {
  return getSupabaseClient() !== null;
}
