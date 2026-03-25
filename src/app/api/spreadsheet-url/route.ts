import { NextResponse } from 'next/server';

export async function GET() {
  const spreadsheetId = process.env.SHIPPING_SPREADSHEET_ID;

  if (!spreadsheetId) {
    return NextResponse.json({ error: 'Spreadsheet ID is not configured' }, { status: 500 });
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  return NextResponse.json({ url });
}
