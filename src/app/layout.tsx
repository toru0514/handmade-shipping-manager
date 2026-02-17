import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ハンドメイド発送管理',
  description: 'ハンドメイド作品の発送伝票発行を効率化するシステム',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
