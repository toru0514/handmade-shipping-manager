import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { COOKIE_NAME, verifySessionToken } from '@/lib/session';
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
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const isLoggedIn = token
    ? await verifySessionToken(token, process.env.APP_SESSION_SECRET ?? '')
    : false;

  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">
        {isLoggedIn && <GlobalNav />}
        {children}
      </body>
    </html>
  );
}
