import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GlobalNav } from '@/presentation/components/layout/GlobalNav';

export const metadata: Metadata = {
  title: 'ハンドメイド発送管理',
  description: 'ハンドメイド作品の発送伝票発行を効率化するシステム',
};

async function getIsLoggedIn(): Promise<boolean> {
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore.getAll().some((c) => c.name.startsWith('sb-'));
  if (!hasAuthCookie) return false;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isLoggedIn = await getIsLoggedIn();

  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">
        {isLoggedIn && <GlobalNav />}
        <div
          style={
            isLoggedIn
              ? { marginLeft: 'var(--nav-width, 208px)', transition: 'margin-left 0.2s' }
              : undefined
          }
        >
          {children}
        </div>
      </body>
    </html>
  );
}
