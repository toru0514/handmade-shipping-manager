import { google, sheets_v4 } from 'googleapis';

let cachedSheetsClient: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
  if (cachedSheetsClient) return cachedSheetsClient;

  const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  const spreadsheetId = process.env.PRODUCT_SPREADSHEET_ID;

  if (!base64 || !spreadsheetId) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_BASE64 / PRODUCT_SPREADSHEET_ID が設定されていません。',
    );
  }

  const credentials = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  cachedSheetsClient = google.sheets({ version: 'v4', auth });
  return cachedSheetsClient;
}

export function getSpreadsheetId(): string {
  const spreadsheetId = process.env.PRODUCT_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('PRODUCT_SPREADSHEET_ID が設定されていません。');
  }
  return spreadsheetId;
}
