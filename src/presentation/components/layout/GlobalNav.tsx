'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/orders', label: '注文管理' },
  { href: '/buyers', label: '購入者一覧' },
  { href: '/settings', label: '設定' },
];

export function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href="/orders" className="text-base font-bold text-slate-800 shrink-0">
          ハンドメイド発送管理
        </Link>
        <nav className="flex flex-1 gap-1">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="shrink-0 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}
