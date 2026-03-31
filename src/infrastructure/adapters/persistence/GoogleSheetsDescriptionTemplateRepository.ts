import {
  getSheetsClient,
  getSpreadsheetId,
} from '@/infrastructure/external/google/ProductSheetsClient';
import { getLogger } from '@/infrastructure/lib/logger';
import { getGoogleSheetsRateLimiter } from '@/infrastructure/lib/rate-limiter';

const log = getLogger('description-template-repository');
const rateLimiter = getGoogleSheetsRateLimiter();

const SHEET_TITLE = 'AI説明文テンプレート';
const HEADERS = ['id', 'name', 'body', 'created_at', 'updated_at'];

export type DescriptionTemplate = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

let sheetVerified = false;

async function ensureSheet(): Promise<void> {
  if (sheetVerified) return;

  try {
    await rateLimiter.acquire();
    const sheets = getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    const { data } = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = data.sheets?.some((s) => s.properties?.title === SHEET_TITLE);

    if (!exists) {
      await rateLimiter.acquire();
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: SHEET_TITLE } } }],
        },
      });

      await rateLimiter.acquire();
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_TITLE}!A1:E1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADERS] },
      });

      log.info('AI説明文テンプレートシートを作成しました');
    }

    sheetVerified = true;
  } catch (error) {
    log.error('シート初期化に失敗しました', error);
    throw error;
  }
}

export async function listDescriptionTemplates(): Promise<DescriptionTemplate[]> {
  await ensureSheet();

  try {
    await rateLimiter.acquire();
    const sheets = getSheetsClient();
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${SHEET_TITLE}!A1:ZZ`,
      majorDimension: 'ROWS',
    });

    const values = data.values ?? [];
    if (values.length <= 1) return [];

    const [headerRow, ...rows] = values;
    const idIdx = headerRow.indexOf('id');
    const nameIdx = headerRow.indexOf('name');
    const bodyIdx = headerRow.indexOf('body');
    const createdAtIdx = headerRow.indexOf('created_at');
    const updatedAtIdx = headerRow.indexOf('updated_at');

    return rows
      .filter((row) => row[idIdx]?.trim())
      .map((row) => ({
        id: row[idIdx] ?? '',
        name: row[nameIdx] ?? '',
        body: row[bodyIdx] ?? '',
        createdAt: row[createdAtIdx] ?? '',
        updatedAt: row[updatedAtIdx] ?? '',
      }))
      .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
  } catch (error) {
    log.error('テンプレート一覧の取得に失敗しました', error);
    throw error;
  }
}

export async function addDescriptionTemplate(input: {
  name: string;
  body: string;
}): Promise<DescriptionTemplate> {
  await ensureSheet();

  const now = new Date().toISOString();
  const template: DescriptionTemplate = {
    id: `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name,
    body: input.body,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await rateLimiter.acquire();
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range: `${SHEET_TITLE}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [
          [template.id, template.name, template.body, template.createdAt, template.updatedAt],
        ],
      },
    });

    log.info('テンプレートを追加しました', { id: template.id, name: template.name });
    return template;
  } catch (error) {
    log.error('テンプレートの追加に失敗しました', error);
    throw error;
  }
}

export async function updateDescriptionTemplate(
  templateId: string,
  input: { name: string; body: string },
): Promise<void> {
  await ensureSheet();

  try {
    await rateLimiter.acquire();
    const sheets = getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_TITLE}!A1:ZZ`,
      majorDimension: 'ROWS',
    });

    const values = data.values ?? [];
    if (values.length <= 1) throw new Error('テンプレートが見つかりません');

    const [headerRow, ...rows] = values;
    const idIdx = headerRow.indexOf('id');
    const nameIdx = headerRow.indexOf('name');
    const bodyIdx = headerRow.indexOf('body');
    const updatedAtIdx = headerRow.indexOf('updated_at');

    const targetRowIndex = rows.findIndex((row) => row[idIdx] === templateId);
    if (targetRowIndex === -1) throw new Error('テンプレートが見つかりません');

    const row = rows[targetRowIndex]!;
    row[nameIdx] = input.name;
    row[bodyIdx] = input.body;
    row[updatedAtIdx] = new Date().toISOString();

    const sheetRow = targetRowIndex + 2;

    await rateLimiter.acquire();
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_TITLE}!A${sheetRow}:${String.fromCharCode(65 + headerRow.length - 1)}${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });

    log.info('テンプレートを更新しました', { id: templateId });
  } catch (error) {
    log.error('テンプレートの更新に失敗しました', error);
    throw error;
  }
}

export async function deleteDescriptionTemplate(templateId: string): Promise<void> {
  await ensureSheet();

  try {
    await rateLimiter.acquire();
    const sheets = getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_TITLE}!A1:ZZ`,
      majorDimension: 'ROWS',
    });

    const values = data.values ?? [];
    const [headerRow, ...rows] = values;
    const idIdx = headerRow.indexOf('id');
    const targetRowIndex = rows.findIndex((row) => row[idIdx] === templateId);
    if (targetRowIndex === -1) throw new Error('テンプレートが見つかりません');

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = meta.data.sheets?.find((s) => s.properties?.title === SHEET_TITLE);
    const sheetId = sheet?.properties?.sheetId;
    if (sheetId === undefined) throw new Error('シートが見つかりません');

    const sheetRow = targetRowIndex + 1;

    await rateLimiter.acquire();
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: { sheetId, dimension: 'ROWS', startIndex: sheetRow, endIndex: sheetRow + 1 },
            },
          },
        ],
      },
    });

    log.info('テンプレートを削除しました', { id: templateId });
  } catch (error) {
    log.error('テンプレートの削除に失敗しました', error);
    throw error;
  }
}
