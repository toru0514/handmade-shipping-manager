import { NextResponse } from 'next/server';
import { createSessionToken, COOKIE_NAME } from '@/lib/session';

export async function POST(request: Request) {
  const storedPassword = process.env.APP_PASSWORD;
  if (!storedPassword) {
    return NextResponse.json({ error: 'APP_PASSWORD が設定されていません' }, { status: 500 });
  }

  let password: string;
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が不正です' }, { status: 400 });
  }

  if (password !== storedPassword) {
    return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 401 });
  }

  const secret = process.env.APP_SESSION_SECRET ?? '';
  const token = await createSessionToken(secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
  return res;
}
