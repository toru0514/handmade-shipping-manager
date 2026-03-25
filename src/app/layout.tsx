import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GlobalNav, DRAWER_WIDTH_OPEN } from '@/presentation/components/layout/GlobalNav';
import { ThemeRegistry } from '@/presentation/components/providers/ThemeRegistry';
import { ToastProvider } from '@/presentation/components/providers/ToastProvider';

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
        <ThemeRegistry>
          <ToastProvider>
            {isLoggedIn && <GlobalNav />}
            <div
              style={
                isLoggedIn
                  ? {
                      marginLeft: `var(--nav-width, ${DRAWER_WIDTH_OPEN}px)`,
                      transition: 'margin-left 0.2s',
                    }
                  : undefined
              }
            >
              {children}
            </div>
          </ToastProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
