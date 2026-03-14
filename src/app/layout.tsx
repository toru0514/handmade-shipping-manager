import type { Metadata } from 'next';
import './globals.css';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GlobalNav } from '@/presentation/components/layout/GlobalNav';

export const metadata: Metadata = {
  title: 'ハンドメイド発送管理',
  description: 'ハンドメイド作品の発送伝票発行を効率化するシステム',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">
        {isLoggedIn && <GlobalNav />}
        {children}
      </body>
    </html>
  );
}
