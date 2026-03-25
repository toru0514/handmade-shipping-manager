import { config } from 'dotenv';
import { google } from 'googleapis';

config({ path: '.env.local' });

async function main() {
  const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!base64 || !spreadsheetId) {
    throw new Error(
      'Environment variables GOOGLE_SERVICE_ACCOUNT_BASE64 / GOOGLE_SHEETS_SPREADSHEET_ID are not set.',
    );
  }

  const credentials = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const sheetTitle = process.env.GOOGLE_SHEETS_WORKSHEET_TITLE || 'シート1';

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!A1:ZZ200`,
    majorDimension: 'ROWS',
  });

  const values = response.data.values ?? [];

  if (!values.length) {
    console.log('Spreadsheet is empty or range returned no values.');
    return;
  }

  console.log('Spreadsheet preview (first 10 rows):');
  for (const row of values.slice(0, 10)) {
    console.log(row);
  }
}

main().catch((error) => {
  console.error('Google Sheets API call failed:', error);
  process.exit(1);
});
