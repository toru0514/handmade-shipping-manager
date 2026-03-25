import { sheets_v4 } from 'googleapis';
import {
  getSheetsClient,
  getSpreadsheetId,
} from '@/infrastructure/external/google/ProductSheetsClient';
import type {
  AddProductInput,
  ProductRepositoryPort,
  UpdateProductInput,
  UpdateProductStatusInput,
} from '@/domain/ports/ProductRepositoryPort';
import type { PlatformJobSnapshot, SpreadsheetProductRecord } from '@/domain/types/product';
import type { JobStatus, ProductStatus } from '@/domain/types/status';
import { getLogger } from '@/infrastructure/lib/logger';
import { getGoogleSheetsRateLimiter } from '@/infrastructure/lib/rate-limiter';
import {
  resolveMinneParentIdByLabel,
  resolveMinneChildIdByLabel,
} from '@/infrastructure/lib/categories/minne-categories';

const log = getLogger('google-sheets-repository');
const rateLimiter = getGoogleSheetsRateLimiter();

const DEFAULT_SHEET_TITLE = 'シート1';
const VALUE_RANGE = 'A1:ZZ'; // covers columns A-ZZ (~702 columns)

// マルチシート構成の設定
type SheetConfig = {
  common: string;
  creema: string;
  minne: string;
  base: string;
  iichi: string;
};

type AllSheetsData = {
  common: SheetMatrix;
  platforms: {
    creema: SheetMatrix | null;
    minne: SheetMatrix | null;
    base: SheetMatrix | null;
    iichi: SheetMatrix | null;
  };
};

// iichi用素材マッピング（別名→正式名の変換のみ）
const IICHI_MATERIAL_MAP: Record<string, string> = {
  木: '木材',
  ウッド: '木材',
  レザー: '革',
  シルバー: '銀',
  プラスチック: '樹脂',
};
const MOCK_SHEET_MATRIX: SheetMatrix = {
  headerRow: [
    'product_id',
    'title',
    'description',
    'price',
    'inventory',
    'tags',
    '出品先',
    'ステータス',
    '最終同期',
    'エラーメモ',
    'creema_status',
    'creema_last_synced_at',
    'creema_last_error',
    'minne_status',
    'minne_last_synced_at',
    'minne_last_error',
  ],
  rows: [
    [
      'demo-1',
      'Creema向けリング',
      'Creema 自動化のスモークテスト用レコードです。',
      '3500',
      '5',
      'リング,シルバー',
      'Creema,Minne',
      '下書き準備済み',
      '2024-11-01 10:00',
      '',
      'processing',
      '2024-10-31 22:00',
      '',
      'queued',
      '',
      '',
    ],
    [
      'demo-2',
      'Minne向けピアス',
      'CI スモークテストで一覧に表示される確認用データです。',
      '4200',
      '8',
      'ピアス,ゴールド',
      'Minne',
      'エラー',
      '2024-10-20 09:30',
      '画像URLが不足しています',
      '',
      '',
      '',
      'error',
      '2024-10-19 18:20',
      '一時的なエラー',
    ],
  ],
};

const PRODUCT_STATUS_ALIASES: Record<ProductStatus, string[]> = {
  new: ['new', '新規'],
  ready: ['ready', '下書き準備済み', '準備済み'],
  queued: ['queued', '待機中', 'キュー待ち'],
  processing: ['processing', '処理中'],
  drafted: ['drafted', '下書き作成済み', '下書き完了', '完了'],
  error: ['error', 'エラー'],
  skipped: ['skipped', 'スキップ', '対象外'],
};

const JOB_STATUS_ALIASES: Record<JobStatus, string[]> = {
  queued: ['queued', '待機中', 'ready', '下書き準備済み'],
  processing: ['processing', '処理中'],
  success: ['success', 'done', '完了', 'drafted', '下書き作成済み'],
  error: ['error', 'failed', 'エラー'],
  skipped: ['skipped', 'skipped', '対象外'],
};

const HEADER_ALIASES = {
  productId: ['product_id', 'id', '商品id', '商品ID'],
  title: ['title', '商品名'],
  description: ['description', '商品説明'],
  price: ['price', '価格'],
  inventory: ['inventory', '在庫'],
  tags: ['tags', 'タグ'],
  platforms: ['出品先', 'platforms', 'platform'],
  syncStatus: ['sync_status', 'ステータス'],
  lastSyncedAt: ['last_synced_at', '最終同期'],
  lastError: ['last_error', 'エラーメモ', '最新エラー'],
  note: ['notes_internal', 'メモ', 'note'],
};

const PLATFORM_PREFIXES = ['creema', 'minne', 'base', 'iichi'];

// 共通シートの列エイリアス
const COMMON_HEADER_ALIASES = {
  sku: ['sku', 'SKU'],
  material: ['material', '素材'],
  sizeNotes: ['size_notes', 'サイズ備考'],
  weightGrams: ['weight_grams', '重量', '重量g'],
  imageUrls: ['image_urls', '画像URL', '画像'],
  productionLeadTimeDays: ['production_lead_time_days', '制作日数', 'リードタイム'],
  shippingFee: ['shipping_fee', '送料'],
  shippingMethod: ['shipping_method', '配送方法'],
  shippingOriginPref: ['shipping_origin_pref', '発送元'],
};

type SheetMatrix = {
  headerRow: string[];
  rows: string[][];
};

function shouldUseMockSheetData(): boolean {
  return process.env.USE_MOCK_SHEETS_DATA === 'true';
}

function getMockSheetMatrix(): SheetMatrix {
  return {
    headerRow: [...MOCK_SHEET_MATRIX.headerRow],
    rows: MOCK_SHEET_MATRIX.rows.map((row) => [...row]),
  };
}

function getSheetTitle(): string {
  return process.env.GOOGLE_SHEETS_WORKSHEET_TITLE || DEFAULT_SHEET_TITLE;
}

function getSheetConfig(): SheetConfig {
  return {
    common: process.env.GOOGLE_SHEETS_COMMON_SHEET || '共通',
    creema: process.env.GOOGLE_SHEETS_CREEMA_SHEET || 'Creema',
    minne: process.env.GOOGLE_SHEETS_MINNE_SHEET || 'minne',
    base: process.env.GOOGLE_SHEETS_BASE_SHEET || 'BASE',
    iichi: process.env.GOOGLE_SHEETS_IICHI_SHEET || 'iichi',
  };
}

function isMultiSheetMode(): boolean {
  // 共通シートの環境変数が設定されていればマルチシートモード
  return !!process.env.GOOGLE_SHEETS_COMMON_SHEET;
}

function mapToIichiMaterialLabel(material: string): string {
  return IICHI_MATERIAL_MAP[material] ?? material;
}

function normalizeHeaderName(value: string): string {
  return value.replace(/[\s\u3000]/g, '').toLowerCase();
}

function findColumnIndex(headerRow: string[], aliases: string[]): number | null {
  const normalizedHeaders = headerRow.map(normalizeHeaderName);
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeaderName(alias);
    const index = normalizedHeaders.indexOf(normalizedAlias);
    if (index !== -1) return index;
  }
  return null;
}

function columnIndexToLetter(index: number): string {
  const baseCharCode = 'A'.charCodeAt(0);
  let dividend = index + 1;
  let columnName = '';

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(baseCharCode + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}

function normalizeProductStatus(value: string | null | undefined): ProductStatus {
  if (!value) return 'ready';
  const normalized = value.trim().toLowerCase();
  for (const [status, keywords] of Object.entries(PRODUCT_STATUS_ALIASES)) {
    if (keywords.some((keyword) => keyword.toLowerCase() === normalized)) {
      return status as ProductStatus;
    }
  }
  return 'ready';
}

function normalizeJobStatus(value: string | null | undefined): JobStatus {
  if (!value) return 'queued';
  const normalized = value.trim().toLowerCase();
  for (const [status, keywords] of Object.entries(JOB_STATUS_ALIASES)) {
    if (keywords.some((keyword) => keyword.toLowerCase() === normalized)) {
      return status as JobStatus;
    }
  }
  return 'queued';
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const sanitized = value.replace(/[,\s]/g, '');
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitMultiValue(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\n,、;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePlatformName(value: string): string {
  const lower = value.trim().toLowerCase();
  if (lower.includes('creema')) return 'creema';
  if (lower.includes('minne')) return 'minne';
  if (lower.includes('base')) return 'base';
  if (lower.includes('iichi')) return 'iichi';
  return lower;
}

function extractPlatformSnapshots(raw: Record<string, string>): PlatformJobSnapshot[] {
  const snapshots = new Map<string, PlatformJobSnapshot>();

  for (const [rawKey, rawValue] of Object.entries(raw)) {
    const key = normalizeHeaderName(rawKey);
    const platformMatch = PLATFORM_PREFIXES.find((prefix) =>
      key.startsWith(normalizeHeaderName(prefix)),
    );

    if (!platformMatch) continue;

    const suffix = key.slice(normalizeHeaderName(platformMatch).length);
    const normalizedSuffix = suffix.replace(/^[-_]+/, '');
    const compactSuffix = normalizedSuffix.replace(/[-_]/g, '');
    const snapshot = snapshots.get(platformMatch) ?? {
      platform: platformMatch,
      status: 'queued',
      lastSyncedAt: null,
      lastError: null,
      lastJobStartedAt: null,
      lastDurationSeconds: null,
      attemptCount: null,
    };

    if (compactSuffix === 'status') {
      snapshot.status = normalizeJobStatus(rawValue);
    } else if (compactSuffix === 'lastsyncedat') {
      snapshot.lastSyncedAt = rawValue || null;
    } else if (compactSuffix === 'lasterror') {
      snapshot.lastError = rawValue || null;
    } else if (compactSuffix === 'lasterrormessage') {
      snapshot.lastError = rawValue || null;
    } else if (compactSuffix === 'lastjobstartedat') {
      snapshot.lastJobStartedAt = rawValue || null;
    } else if (compactSuffix === 'lastdurationseconds') {
      snapshot.lastDurationSeconds = parseNumber(rawValue);
    } else if (compactSuffix === 'attempt' || compactSuffix === 'retrycount') {
      snapshot.attemptCount = parseNumber(rawValue);
    }

    snapshots.set(platformMatch, snapshot);
  }

  return Array.from(snapshots.values());
}

function buildRawRecord(headerRow: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  headerRow.forEach((header, index) => {
    if (!header) return;
    record[header] = row[index] ?? '';
  });
  return record;
}

export class GoogleSheetsProductRepository implements ProductRepositoryPort {
  async listProducts(): Promise<SpreadsheetProductRecord[]> {
    // マルチシートモードの場合は新しい読み込みロジックを使用
    if (isMultiSheetMode()) {
      return this.listProductsMultiSheet();
    }

    // 従来のシングルシートモード
    return this.listProductsSingleSheet();
  }

  private async listProductsSingleSheet(): Promise<SpreadsheetProductRecord[]> {
    const matrix = await this.fetchSheetMatrix();
    if (!matrix) return [];
    const { headerRow, rows } = matrix;

    const productIdIndex = findColumnIndex(headerRow, HEADER_ALIASES.productId);
    const titleIndex = findColumnIndex(headerRow, HEADER_ALIASES.title);
    const descriptionIndex = findColumnIndex(headerRow, HEADER_ALIASES.description);
    const priceIndex = findColumnIndex(headerRow, HEADER_ALIASES.price);
    const inventoryIndex = findColumnIndex(headerRow, HEADER_ALIASES.inventory);
    const tagsIndex = findColumnIndex(headerRow, HEADER_ALIASES.tags);
    const platformsIndex = findColumnIndex(headerRow, HEADER_ALIASES.platforms);
    const syncStatusIndex = findColumnIndex(headerRow, HEADER_ALIASES.syncStatus);
    const lastSyncedAtIndex = findColumnIndex(headerRow, HEADER_ALIASES.lastSyncedAt);
    const lastErrorIndex = findColumnIndex(headerRow, HEADER_ALIASES.lastError);

    const records: SpreadsheetProductRecord[] = [];

    rows.forEach((row, rowIndex) => {
      const rowNumber = rowIndex + 2; // header row is 1
      const raw = buildRawRecord(headerRow, row);

      const productId = productIdIndex !== null ? (row[productIdIndex] ?? '') : '';
      if (!productId) return; // skip empty rows

      const title = titleIndex !== null ? (row[titleIndex] ?? '') : '';
      const description = descriptionIndex !== null ? (row[descriptionIndex] ?? '') : '';

      const price = priceIndex !== null ? parseNumber(row[priceIndex]) : null;
      const inventory = inventoryIndex !== null ? parseNumber(row[inventoryIndex]) : null;
      const tags = tagsIndex !== null ? splitMultiValue(row[tagsIndex]) : [];
      const platforms =
        platformsIndex !== null
          ? splitMultiValue(row[platformsIndex]).map(normalizePlatformName)
          : [];

      const syncStatusRaw = syncStatusIndex !== null ? (row[syncStatusIndex] ?? '') : '';
      const syncStatus = normalizeProductStatus(syncStatusRaw);

      const lastSyncedAt = lastSyncedAtIndex !== null ? (row[lastSyncedAtIndex] ?? null) : null;
      const lastError = lastErrorIndex !== null ? (row[lastErrorIndex] ?? null) : null;

      const platformSnapshots = extractPlatformSnapshots(raw);

      records.push({
        rowNumber,
        id: productId,
        title,
        description,
        price,
        inventory,
        tags,
        platforms,
        syncStatus,
        lastSyncedAt,
        lastError,
        platformSnapshots,
        raw,
      });
    });

    return records;
  }

  private async listProductsMultiSheet(): Promise<SpreadsheetProductRecord[]> {
    const allData = await this.fetchAllSheetMatrices();
    if (!allData) return [];

    const { common, platforms } = allData;
    const { headerRow: commonHeader, rows: commonRows } = common;

    // 共通シートの列インデックスを取得
    const productIdIndex = findColumnIndex(commonHeader, HEADER_ALIASES.productId);
    const titleIndex = findColumnIndex(commonHeader, HEADER_ALIASES.title);
    const descriptionIndex = findColumnIndex(commonHeader, HEADER_ALIASES.description);
    const priceIndex = findColumnIndex(commonHeader, HEADER_ALIASES.price);
    const inventoryIndex = findColumnIndex(commonHeader, HEADER_ALIASES.inventory);
    const tagsIndex = findColumnIndex(commonHeader, HEADER_ALIASES.tags);
    const platformsIndex = findColumnIndex(commonHeader, HEADER_ALIASES.platforms);
    const syncStatusIndex = findColumnIndex(commonHeader, HEADER_ALIASES.syncStatus);
    const lastSyncedAtIndex = findColumnIndex(commonHeader, HEADER_ALIASES.lastSyncedAt);
    const lastErrorIndex = findColumnIndex(commonHeader, HEADER_ALIASES.lastError);

    // 各PFシートのproduct_idインデックスマップを構築
    const pfProductIdIndexes: Record<string, number | null> = {};
    const pfRowsByProductId: Record<
      string,
      Record<string, { row: string[]; header: string[] }>
    > = {};

    for (const [pfName, pfMatrix] of Object.entries(platforms)) {
      if (!pfMatrix) continue;
      const pfProductIdIdx = findColumnIndex(pfMatrix.headerRow, HEADER_ALIASES.productId);
      pfProductIdIndexes[pfName] = pfProductIdIdx;
      pfRowsByProductId[pfName] = {};

      if (pfProductIdIdx !== null) {
        for (const row of pfMatrix.rows) {
          const pid = row[pfProductIdIdx];
          if (pid) {
            pfRowsByProductId[pfName][pid] = { row, header: pfMatrix.headerRow };
          }
        }
      }
    }

    const records: SpreadsheetProductRecord[] = [];

    commonRows.forEach((commonRow, rowIndex) => {
      const rowNumber = rowIndex + 2;
      const productId = productIdIndex !== null ? (commonRow[productIdIndex] ?? '') : '';
      if (!productId) return;

      const baseRaw = buildRawRecord(commonHeader, commonRow);
      const { mergedRaw, platformSnapshots } = this.mergePlatformOverrides(
        productId,
        baseRaw,
        pfRowsByProductId,
      );

      this.applyIichiMappings(mergedRaw, commonHeader, commonRow);
      this.applyMinneCategoryResolution(mergedRaw);

      // 既存のスナップショットを共通シートから抽出してマージ
      const commonSnapshots = extractPlatformSnapshots(baseRaw);
      for (const cs of commonSnapshots) {
        if (!platformSnapshots.some((ps) => ps.platform === cs.platform)) {
          platformSnapshots.push(cs);
        }
      }

      const title = titleIndex !== null ? (commonRow[titleIndex] ?? '') : '';
      const description = descriptionIndex !== null ? (commonRow[descriptionIndex] ?? '') : '';
      const price = priceIndex !== null ? parseNumber(commonRow[priceIndex]) : null;
      const inventory = inventoryIndex !== null ? parseNumber(commonRow[inventoryIndex]) : null;
      const tags = tagsIndex !== null ? splitMultiValue(commonRow[tagsIndex]) : [];
      const platformsList =
        platformsIndex !== null
          ? splitMultiValue(commonRow[platformsIndex]).map(normalizePlatformName)
          : [];
      const syncStatusRaw = syncStatusIndex !== null ? (commonRow[syncStatusIndex] ?? '') : '';
      const syncStatus = normalizeProductStatus(syncStatusRaw);
      const lastSyncedAt =
        lastSyncedAtIndex !== null ? (commonRow[lastSyncedAtIndex] ?? null) : null;
      const lastError = lastErrorIndex !== null ? (commonRow[lastErrorIndex] ?? null) : null;

      records.push({
        rowNumber,
        id: productId,
        title,
        description,
        price,
        inventory,
        tags,
        platforms: platformsList,
        syncStatus,
        lastSyncedAt,
        lastError,
        platformSnapshots,
        raw: mergedRaw,
      });
    });

    return records;
  }

  /**
   * 各PFシートの値を共通シートのベース値にマージする
   */
  private mergePlatformOverrides(
    productId: string,
    baseRaw: Record<string, string>,
    pfRowsByProductId: Record<string, Record<string, { row: string[]; header: string[] }>>,
  ): { mergedRaw: Record<string, string>; platformSnapshots: PlatformJobSnapshot[] } {
    const mergedRaw: Record<string, string> = { ...baseRaw };
    const platformSnapshots: PlatformJobSnapshot[] = [];

    for (const [pfName, pfData] of Object.entries(pfRowsByProductId)) {
      const pfRecord = pfData[productId];
      if (!pfRecord) continue;

      const pfRaw = buildRawRecord(pfRecord.header, pfRecord.row);

      for (const [key, value] of Object.entries(pfRaw)) {
        const normalizedKey = normalizeHeaderName(key);
        // PF固有列（プレフィックス付き）、または共通シートにキーが存在しない列をマージ
        if (normalizedKey.startsWith(pfName) || (value && !(key in baseRaw))) {
          mergedRaw[key] = value;
        }
        // 共通列の上書き: 値が存在し、異なる場合はoverride記録
        if (value && key in baseRaw && value !== baseRaw[key]) {
          mergedRaw[`${pfName}_override_${key}`] = value;
        }
      }

      platformSnapshots.push(...extractPlatformSnapshots(pfRaw));
    }

    return { mergedRaw, platformSnapshots };
  }

  /**
   * iichi用の素材・配送方法マッピングを適用
   */
  private applyIichiMappings(
    mergedRaw: Record<string, string>,
    commonHeader: string[],
    commonRow: string[],
  ): void {
    const materialIndex = findColumnIndex(commonHeader, COMMON_HEADER_ALIASES.material);
    const shippingMethodIndex = findColumnIndex(commonHeader, COMMON_HEADER_ALIASES.shippingMethod);

    if (materialIndex !== null && commonRow[materialIndex]) {
      mergedRaw['iichi_material_label'] = mapToIichiMaterialLabel(commonRow[materialIndex]);
    }
    if (shippingMethodIndex !== null && commonRow[shippingMethodIndex]) {
      mergedRaw['iichi_shipping_method_label'] = commonRow[shippingMethodIndex];
    }
  }

  /**
   * minne用のカテゴリラベル→ID変換を適用
   */
  private applyMinneCategoryResolution(mergedRaw: Record<string, string>): void {
    const parentLabel = mergedRaw['minne_category_parent_label'];
    const childLabel = mergedRaw['minne_category_label'];

    if (parentLabel) {
      const parentId = resolveMinneParentIdByLabel(parentLabel);
      if (parentId) {
        mergedRaw['minne_category_parent_id'] = parentId;
      }
    }
    if (parentLabel && childLabel) {
      const childId = resolveMinneChildIdByLabel(parentLabel, childLabel);
      if (childId) {
        mergedRaw['minne_category_id'] = childId;
      }
    }
  }

  async findProductById(productId: string): Promise<SpreadsheetProductRecord | null> {
    const products = await this.listProducts();
    return products.find((product) => product.id === productId) ?? null;
  }

  async addProduct(input: AddProductInput): Promise<void> {
    if (shouldUseMockSheetData()) {
      log.warn('USE_MOCK_SHEETS_DATA=true のため addProduct をスキップしました', {
        productId: input.productId,
      });
      return;
    }

    try {
      const matrix = await this.fetchSheetMatrix();
      if (!matrix) {
        throw new Error('スプレッドシートのヘッダー行を取得できませんでした。');
      }
      const { headerRow } = matrix;

      const newRow: string[] = new Array(headerRow.length).fill('');

      const fieldMapping: { aliases: string[]; value: string }[] = [
        { aliases: HEADER_ALIASES.productId, value: input.productId },
        { aliases: HEADER_ALIASES.title, value: input.title },
        { aliases: HEADER_ALIASES.description, value: input.description },
        { aliases: HEADER_ALIASES.price, value: input.price !== null ? String(input.price) : '' },
        {
          aliases: HEADER_ALIASES.inventory,
          value: input.inventory !== null ? String(input.inventory) : '',
        },
        { aliases: HEADER_ALIASES.platforms, value: input.platforms.join(',') },
        { aliases: HEADER_ALIASES.syncStatus, value: 'new' },
      ];

      for (const { aliases, value } of fieldMapping) {
        const index = findColumnIndex(headerRow, aliases);
        if (index !== null) {
          newRow[index] = value;
        }
      }

      await rateLimiter.acquire();

      const sheets = getSheetsClient();
      const sheetTitle = getSheetTitle();

      await sheets.spreadsheets.values.append({
        spreadsheetId: getSpreadsheetId(),
        range: `${sheetTitle}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [newRow],
        },
      });

      log.info('スプレッドシートに商品を追加しました', {
        productId: input.productId,
        title: input.title,
      });
    } catch (error) {
      log.error('スプレッドシートへの商品追加に失敗しました', error, {
        productId: input.productId,
      });
      throw error;
    }
  }

  async updateProduct(input: UpdateProductInput): Promise<void> {
    if (shouldUseMockSheetData()) {
      log.warn('USE_MOCK_SHEETS_DATA=true のため updateProduct をスキップしました', {
        productId: input.productId,
      });
      return;
    }

    try {
      const matrix = await this.fetchSheetMatrix();
      if (!matrix) return;
      const { headerRow, rows } = matrix;

      const productIdIndex = findColumnIndex(headerRow, HEADER_ALIASES.productId);
      if (productIdIndex === null) {
        throw new Error('product_id 列が見つかりませんでした。');
      }

      let targetRowNumber: number | null = null;
      rows.forEach((row, rowIndex) => {
        if (row[productIdIndex] === input.productId) {
          targetRowNumber = rowIndex + 2;
        }
      });

      if (!targetRowNumber) {
        throw new Error(`product_id=${input.productId} の行が見つかりませんでした。`);
      }

      const updates: sheets_v4.Schema$ValueRange[] = [];
      const sheetTitle = getSheetTitle();

      for (const [key, value] of Object.entries(input.fields)) {
        const colIndex = headerRow.indexOf(key);
        if (colIndex === -1) {
          console.warn(`[updateProduct] ヘッダーに列 "${key}" が見つかりません。スキップします。`);
          continue;
        }
        updates.push({
          range: `${sheetTitle}!${columnIndexToLetter(colIndex)}${targetRowNumber}`,
          values: [[value]],
        });
      }

      if (!updates.length) return;

      await rateLimiter.acquire();

      const sheets = getSheetsClient();
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: getSpreadsheetId(),
        requestBody: {
          valueInputOption: 'RAW',
          data: updates,
        },
      });

      log.info('スプレッドシート商品更新完了', {
        productId: input.productId,
        updatedFields: updates.length,
      });
    } catch (error) {
      log.error('スプレッドシート商品更新失敗', error, {
        productId: input.productId,
      });
      throw error;
    }
  }

  async addProductRaw(fields: Record<string, string>): Promise<void> {
    if (shouldUseMockSheetData()) {
      log.warn('USE_MOCK_SHEETS_DATA=true のため addProductRaw をスキップしました');
      return;
    }

    try {
      const matrix = await this.fetchSheetMatrix();
      if (!matrix) {
        throw new Error('スプレッドシートのヘッダー行を取得できませんでした。');
      }
      const { headerRow } = matrix;

      const newRow: string[] = new Array(headerRow.length).fill('');

      for (const [key, value] of Object.entries(fields)) {
        const colIndex = headerRow.indexOf(key);
        if (colIndex !== -1) {
          newRow[colIndex] = value;
        }
      }

      await rateLimiter.acquire();

      const sheets = getSheetsClient();
      const sheetTitle = getSheetTitle();

      await sheets.spreadsheets.values.append({
        spreadsheetId: getSpreadsheetId(),
        range: `${sheetTitle}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [newRow],
        },
      });

      log.info('スプレッドシートにraw商品を追加しました', {
        fieldCount: Object.keys(fields).length,
      });
    } catch (error) {
      log.error('スプレッドシートへのraw商品追加に失敗しました', error);
      throw error;
    }
  }

  async updateProductStatuses(input: UpdateProductStatusInput): Promise<void> {
    if (shouldUseMockSheetData()) {
      log.warn('USE_MOCK_SHEETS_DATA=true のため updateProductStatuses をスキップしました', {
        productId: input.productId,
      });
      return;
    }

    // マルチシートモードの場合
    if (isMultiSheetMode()) {
      await this.updateProductStatusesMultiSheet(input);
      return;
    }

    // 従来のシングルシートモード
    await this.updateProductStatusesSingleSheet(input);
  }

  private async updateProductStatusesSingleSheet(input: UpdateProductStatusInput): Promise<void> {
    try {
      const matrix = await this.fetchSheetMatrix();
      if (!matrix) return;
      const { headerRow, rows } = matrix;

      const productIdIndex = findColumnIndex(headerRow, HEADER_ALIASES.productId);
      if (productIdIndex === null) {
        throw new Error('product_id 列が見つかりませんでした。');
      }

      let targetRowNumber: number | null = null;
      rows.forEach((row, rowIndex) => {
        const rowProductId = row[productIdIndex];
        if (rowProductId && rowProductId === input.productId) {
          targetRowNumber = rowIndex + 2; // header row offset
        }
      });

      if (!targetRowNumber) {
        throw new Error(`product_id=${input.productId} の行が見つかりませんでした。`);
      }

      const updates: sheets_v4.Schema$ValueRange[] = [];
      const sheetTitle = getSheetTitle();

      if (input.syncStatus) {
        const index = findColumnIndex(headerRow, HEADER_ALIASES.syncStatus);
        if (index !== null) {
          updates.push({
            range: `${sheetTitle}!${columnIndexToLetter(index)}${targetRowNumber}`,
            values: [[input.syncStatus]],
          });
        }
      }

      if (input.platformStatuses) {
        for (const [platform, status] of Object.entries(input.platformStatuses)) {
          if (!status) continue;
          const alias = [`${platform}_status`, `${platform}status`];
          const index = findColumnIndex(headerRow, alias);
          if (index !== null) {
            updates.push({
              range: `${sheetTitle}!${columnIndexToLetter(index)}${targetRowNumber}`,
              values: [[status]],
            });
          }
        }
      }

      if (input.lastSyncedTimestamps) {
        for (const [platform, timestamp] of Object.entries(input.lastSyncedTimestamps)) {
          const alias = [
            `${platform}_last_synced_at`,
            `${platform}lastsyncedat`,
            `last_synced_at_${platform}`,
          ];
          const index = findColumnIndex(headerRow, alias);
          if (index !== null) {
            updates.push({
              range: `${sheetTitle}!${columnIndexToLetter(index)}${targetRowNumber}`,
              values: [[timestamp ?? '']],
            });
          }
        }
      }

      if (input.clearErrorsForPlatforms?.length) {
        // 共通エラー列を空にする
        const commonErrorIndex = findColumnIndex(headerRow, HEADER_ALIASES.lastError);
        if (commonErrorIndex !== null) {
          updates.push({
            range: `${sheetTitle}!${columnIndexToLetter(commonErrorIndex)}${targetRowNumber}`,
            values: [['']],
          });
        }

        for (const platform of input.clearErrorsForPlatforms) {
          const aliases = [
            `${platform}_last_error`,
            `${platform}_last_error_message`,
            `last_error_message_${platform}`,
            `${platform}lasterror`,
          ];
          const index = findColumnIndex(headerRow, aliases);
          if (index !== null) {
            updates.push({
              range: `${sheetTitle}!${columnIndexToLetter(index)}${targetRowNumber}`,
              values: [['']],
            });
          }
        }
      }

      if ('note' in input) {
        const noteIndex = findColumnIndex(headerRow, HEADER_ALIASES.note);
        if (noteIndex !== null) {
          updates.push({
            range: `${sheetTitle}!${columnIndexToLetter(noteIndex)}${targetRowNumber}`,
            values: [[input.note ?? '']],
          });
        }
      }

      if (!updates.length) return;

      // Apply rate limiting before API call
      await rateLimiter.acquire();

      const sheets = getSheetsClient();
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: getSpreadsheetId(),
        requestBody: {
          valueInputOption: 'RAW',
          data: updates,
        },
      });

      log.info('スプレッドシート更新完了', {
        productId: input.productId,
        updatedFields: updates.length,
      });
    } catch (error) {
      log.error('スプレッドシート更新失敗', error, {
        productId: input.productId,
      });
      throw error;
    }
  }

  private async updateProductStatusesMultiSheet(input: UpdateProductStatusInput): Promise<void> {
    try {
      const config = getSheetConfig();
      const allData = await this.fetchAllSheetMatrices();
      if (!allData) return;

      const { common, platforms } = allData;
      const commonHeader = common.headerRow;
      const commonRows = common.rows;

      // 共通シートでproduct_idを検索
      const productIdIndex = findColumnIndex(commonHeader, HEADER_ALIASES.productId);
      if (productIdIndex === null) {
        throw new Error('共通シートに product_id 列が見つかりませんでした。');
      }

      let commonRowNumber: number | null = null;
      commonRows.forEach((row, rowIndex) => {
        if (row[productIdIndex] === input.productId) {
          commonRowNumber = rowIndex + 2;
        }
      });

      if (!commonRowNumber) {
        throw new Error(`product_id=${input.productId} が共通シートに見つかりませんでした。`);
      }

      const updates: sheets_v4.Schema$ValueRange[] = [];

      // 共通シートへの更新（ステータス、最終同期、エラーなど共通管理列）
      if (input.syncStatus) {
        const index = findColumnIndex(commonHeader, HEADER_ALIASES.syncStatus);
        if (index !== null) {
          updates.push({
            range: `'${config.common}'!${columnIndexToLetter(index)}${commonRowNumber}`,
            values: [[input.syncStatus]],
          });
        }
      }

      if (input.clearErrorsForPlatforms?.length) {
        const commonErrorIndex = findColumnIndex(commonHeader, HEADER_ALIASES.lastError);
        if (commonErrorIndex !== null) {
          updates.push({
            range: `'${config.common}'!${columnIndexToLetter(commonErrorIndex)}${commonRowNumber}`,
            values: [['']],
          });
        }
      }

      if ('note' in input) {
        const noteIndex = findColumnIndex(commonHeader, HEADER_ALIASES.note);
        if (noteIndex !== null) {
          updates.push({
            range: `'${config.common}'!${columnIndexToLetter(noteIndex)}${commonRowNumber}`,
            values: [[input.note ?? '']],
          });
        }
      }

      // 各PFシートへの更新
      const pfSheetConfig: Record<string, { sheet: string; matrix: SheetMatrix | null }> = {
        creema: { sheet: config.creema, matrix: platforms.creema },
        minne: { sheet: config.minne, matrix: platforms.minne },
        base: { sheet: config.base, matrix: platforms.base },
        iichi: { sheet: config.iichi, matrix: platforms.iichi },
      };

      for (const [platform, { sheet: pfSheet, matrix: pfMatrix }] of Object.entries(
        pfSheetConfig,
      )) {
        if (!pfMatrix) continue;

        const pfProductIdIndex = findColumnIndex(pfMatrix.headerRow, HEADER_ALIASES.productId);
        if (pfProductIdIndex === null) continue;

        let pfRowNumber: number | null = null;
        pfMatrix.rows.forEach((row, rowIndex) => {
          if (row[pfProductIdIndex] === input.productId) {
            pfRowNumber = rowIndex + 2;
          }
        });

        if (!pfRowNumber) continue;

        // プラットフォームステータス更新
        if (input.platformStatuses?.[platform]) {
          const alias = [`${platform}_status`, `${platform}status`, 'status'];
          const index = findColumnIndex(pfMatrix.headerRow, alias);
          if (index !== null) {
            updates.push({
              range: `'${pfSheet}'!${columnIndexToLetter(index)}${pfRowNumber}`,
              values: [[input.platformStatuses[platform]]],
            });
          }
        }

        // 最終同期タイムスタンプ更新
        if (input.lastSyncedTimestamps?.[platform]) {
          const alias = [`${platform}_last_synced_at`, `${platform}lastsyncedat`, 'last_synced_at'];
          const index = findColumnIndex(pfMatrix.headerRow, alias);
          if (index !== null) {
            updates.push({
              range: `'${pfSheet}'!${columnIndexToLetter(index)}${pfRowNumber}`,
              values: [[input.lastSyncedTimestamps[platform] ?? '']],
            });
          }
        }

        // エラークリア
        if (input.clearErrorsForPlatforms?.includes(platform)) {
          const aliases = [
            `${platform}_last_error`,
            `${platform}_last_error_message`,
            'last_error',
          ];
          const index = findColumnIndex(pfMatrix.headerRow, aliases);
          if (index !== null) {
            updates.push({
              range: `'${pfSheet}'!${columnIndexToLetter(index)}${pfRowNumber}`,
              values: [['']],
            });
          }
        }
      }

      if (!updates.length) return;

      await rateLimiter.acquire();

      const sheets = getSheetsClient();
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: getSpreadsheetId(),
        requestBody: {
          valueInputOption: 'RAW',
          data: updates,
        },
      });

      log.info('マルチシート更新完了', {
        productId: input.productId,
        updatedFields: updates.length,
      });
    } catch (error) {
      log.error('マルチシート更新失敗', error, {
        productId: input.productId,
      });
      throw error;
    }
  }

  private async fetchSheetMatrix(): Promise<SheetMatrix | null> {
    if (shouldUseMockSheetData()) {
      return getMockSheetMatrix();
    }

    try {
      // Apply rate limiting before API call
      await rateLimiter.acquire();

      const sheets = getSheetsClient();
      const spreadsheetId = getSpreadsheetId();
      const sheetTitle = getSheetTitle();
      const range = `${sheetTitle}!${VALUE_RANGE}`;

      const { data } = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        majorDimension: 'ROWS',
      });

      const values = data.values ?? [];
      if (!values.length) {
        log.info('スプレッドシートにデータがありません', { spreadsheetId, range });
        return {
          headerRow: [],
          rows: [],
        };
      }

      const [headerRow, ...rows] = values;
      log.debug('スプレッドシート読み込み完了', {
        headerCount: headerRow.length,
        rowCount: rows.length,
      });
      return { headerRow, rows };
    } catch (error) {
      log.error('スプレッドシート読み込み失敗', error, {
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      });
      throw error;
    }
  }

  private async fetchSheetMatrixByTitle(sheetTitle: string): Promise<SheetMatrix | null> {
    try {
      await rateLimiter.acquire();

      const sheets = getSheetsClient();
      const spreadsheetId = getSpreadsheetId();
      const range = `${sheetTitle}!${VALUE_RANGE}`;

      const { data } = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        majorDimension: 'ROWS',
      });

      const values = data.values ?? [];
      if (!values.length) {
        log.debug(`シート「${sheetTitle}」にデータがありません`, { spreadsheetId, range });
        return {
          headerRow: [],
          rows: [],
        };
      }

      const [headerRow, ...rows] = values;
      log.debug(`シート「${sheetTitle}」読み込み完了`, {
        headerCount: headerRow.length,
        rowCount: rows.length,
      });
      return { headerRow, rows };
    } catch (error) {
      // シートが存在しない場合はnullを返す
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Unable to parse range') || errorMessage.includes('not found')) {
        log.warn(`シート「${sheetTitle}」が見つかりません`, { sheetTitle });
        return null;
      }
      log.error(`シート「${sheetTitle}」読み込み失敗`, error);
      throw error;
    }
  }

  private async fetchAllSheetMatrices(): Promise<AllSheetsData | null> {
    if (shouldUseMockSheetData()) {
      return {
        common: getMockSheetMatrix(),
        platforms: {
          creema: null,
          minne: null,
          base: null,
          iichi: null,
        },
      };
    }

    const config = getSheetConfig();

    // 共通シートを取得（必須）
    const common = await this.fetchSheetMatrixByTitle(config.common);
    if (!common) {
      log.error(`共通シート「${config.common}」が見つかりません`);
      return null;
    }

    // 各PFシートを並列で取得
    const [creema, minne, base, iichi] = await Promise.all([
      this.fetchSheetMatrixByTitle(config.creema),
      this.fetchSheetMatrixByTitle(config.minne),
      this.fetchSheetMatrixByTitle(config.base),
      this.fetchSheetMatrixByTitle(config.iichi),
    ]);

    log.info('マルチシート読み込み完了', {
      common: common.rows.length,
      creema: creema?.rows.length ?? 0,
      minne: minne?.rows.length ?? 0,
      base: base?.rows.length ?? 0,
      iichi: iichi?.rows.length ?? 0,
    });

    return {
      common,
      platforms: { creema, minne, base, iichi },
    };
  }
}

export const googleSheetsProductRepository = new GoogleSheetsProductRepository();
