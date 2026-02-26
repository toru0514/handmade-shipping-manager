import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { COOKIE_NAME, verifySessionToken } from '@/lib/session';
import { LogoutButton } from '@/presentation/components/auth/LogoutButton';

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
      <body>
        {isLoggedIn && (
          <div className="flex justify-end bg-gray-100 px-4 py-2">
            <LogoutButton />
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
