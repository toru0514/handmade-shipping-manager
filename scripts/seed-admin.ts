import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '❌ .env.local に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください',
  );
  process.exit(1);
}

const [, , email, password] = process.argv;

if (!email || !password) {
  console.log('使い方: pnpm tsx scripts/seed-admin.ts <email> <password>');
  console.log('例:     pnpm tsx scripts/seed-admin.ts admin@example.com mypassword');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  // Supabase Auth にユーザーを作成（service_role_key で管理者API使用）
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // メール確認をスキップ
  });

  if (error) {
    if (error.message.includes('already been registered')) {
      console.log(`⚠️  ${email} は既に登録されています。パスワードを更新します。`);

      // 既存ユーザーのIDを取得
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users?.users.find((u) => u.email === email);
      if (!user) {
        console.error('❌ ユーザーが見つかりません');
        process.exit(1);
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password,
      });

      if (updateError) {
        console.error('❌ 更新に失敗しました:', updateError.message);
        process.exit(1);
      }
      console.log('✅ パスワードを更新しました');
      return;
    }

    console.error('❌ 登録に失敗しました:', error.message);
    process.exit(1);
  }

  console.log(`✅ 管理者ユーザーを作成しました: ${data.user.email}`);
}

main();
