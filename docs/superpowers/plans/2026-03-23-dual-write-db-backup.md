# デュアルライト DB バックアップ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スプシ（プライマリ）への書き込み時にSupabase（セカンダリ）にも自動保存するデコレーターを導入し、DB→スプシの復元機能も提供する

**Architecture:** デコレーターパターンで既存リポジトリをラップ。読み取りはprimaryのみ、書き込みは両方（secondary失敗はログのみ）。DIコンテナでSupabase設定時のみデコレーターを適用。

**Tech Stack:** TypeScript, Supabase JS Client, Vitest

**Spec:** `docs/superpowers/specs/2026-03-23-dual-write-db-backup-design.md`

---

## Task 1: Logger インターフェース

**Files:**
- Create: `src/infrastructure/logging/Logger.ts`
- Test: `src/infrastructure/logging/__tests__/Logger.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/infrastructure/logging/__tests__/Logger.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ConsoleLogger } from '../Logger';

describe('ConsoleLogger', () => {
  it('warn() は console.warn を呼ぶ', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = new ConsoleLogger();
    logger.warn('test message', { key: 'value' });
    expect(spy).toHaveBeenCalledWith('[DualWrite]', 'test message', { key: 'value' });
    spy.mockRestore();
  });

  it('error() は console.error を呼ぶ', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new ConsoleLogger();
    logger.error('error message', { key: 'value' });
    expect(spy).toHaveBeenCalledWith('[DualWrite]', 'error message', { key: 'value' });
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/infrastructure/logging/__tests__/Logger.test.ts`
Expected: FAIL — `Cannot find module '../Logger'`

- [ ] **Step 3: Write implementation**

```typescript
// src/infrastructure/logging/Logger.ts
export interface Logger {
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn('[DualWrite]', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error('[DualWrite]', message, context);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/infrastructure/logging/__tests__/Logger.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/logging/
git commit -m "feat: Logger インターフェースと ConsoleLogger を追加"
```

---

## Task 2: ポートに findAll / saveAll を追加

**Files:**
- Modify: `src/domain/ports/OrderRepository.ts`
- Modify: `src/domain/ports/ShippingLabelRepository.ts`
- Modify: `src/domain/ports/MessageTemplateRepository.ts`
- Modify: `src/infrastructure/adapters/persistence/SpreadsheetOrderRepository.ts`
- Modify: `src/infrastructure/adapters/persistence/SpreadsheetShippingLabelRepository.ts`
- Modify: `src/infrastructure/adapters/persistence/SpreadsheetMessageTemplateRepository.ts`
- Test: `src/infrastructure/adapters/persistence/__tests__/SpreadsheetOrderRepository.test.ts` (既存に追加)
- Test: `src/infrastructure/adapters/persistence/__tests__/SpreadsheetShippingLabelRepository.test.ts` (既存に追加)
- Test: `src/infrastructure/adapters/persistence/__tests__/SpreadsheetMessageTemplateRepository.test.ts` (既存に追加)

- [ ] **Step 1: OrderRepository に saveAll を追加**

```typescript
// src/domain/ports/OrderRepository.ts — saveAll を追加
export interface OrderRepository<TOrder = Order> {
  findById(orderId: OrderId): Promise<TOrder | null>;
  findByStatus(status: OrderStatus): Promise<TOrder[]>;
  findByBuyerName(name: string): Promise<TOrder[]>;
  save(order: TOrder): Promise<void>;
  saveAll(orders: TOrder[]): Promise<void>;
  exists(orderId: OrderId): Promise<boolean>;
  findAll(): Promise<TOrder[]>;
}
```

- [ ] **Step 2: ShippingLabelRepository に findAll と saveAll を追加**

```typescript
// src/domain/ports/ShippingLabelRepository.ts — findAll, saveAll を追加
export interface ShippingLabelRepository<TShippingLabel = unknown> {
  findById(labelId: LabelId): Promise<TShippingLabel | null>;
  findByOrderId(orderId: OrderId): Promise<TShippingLabel[]>;
  save(label: TShippingLabel): Promise<void>;
  saveAll(labels: TShippingLabel[]): Promise<void>;
  findAll(): Promise<TShippingLabel[]>;
}
```

- [ ] **Step 3: MessageTemplateRepository に findAll と saveAll を追加**

```typescript
// src/domain/ports/MessageTemplateRepository.ts — findAll, saveAll を追加
export interface MessageTemplateRepository<TMessageTemplate = unknown> {
  findByType(type: MessageTemplateType): Promise<TMessageTemplate | null>;
  save(template: TMessageTemplate): Promise<void>;
  saveAll(templates: TMessageTemplate[]): Promise<void>;
  resetToDefault(type: MessageTemplateType): Promise<TMessageTemplate>;
  findAll(): Promise<TMessageTemplate[]>;
}
```

- [ ] **Step 4: SpreadsheetOrderRepository に saveAll を実装**

`src/infrastructure/adapters/persistence/SpreadsheetOrderRepository.ts` に追加:

```typescript
async saveAll(orders: Order[]): Promise<void> {
  const rows: string[][] = [];
  for (const order of orders) {
    rows.push(...this.serializeRows(order));
  }
  await this.sheetsClient.clearRows();
  if (rows.length > 0) {
    await this.sheetsClient.writeRows(rows, DEFAULT_RANGE);
  }
  this.invalidateCache();
}
```

- [ ] **Step 5: SpreadsheetShippingLabelRepository — findAll を public 化 + saveAll 追加**

`src/infrastructure/adapters/persistence/SpreadsheetShippingLabelRepository.ts`:
- `private async findAll()` → `async findAll()` に変更（private を削除）
- `saveAll` メソッドを追加:

```typescript
async saveAll(labels: ShippingLabel[]): Promise<void> {
  const rows = labels.map((label) => this.serialize(label));
  await this.sheetsClient.clearRows();
  if (rows.length > 0) {
    await this.sheetsClient.writeRows(rows, DEFAULT_RANGE);
  }
}
```

- [ ] **Step 6: SpreadsheetMessageTemplateRepository に findAll と saveAll を追加**

`src/infrastructure/adapters/persistence/SpreadsheetMessageTemplateRepository.ts` に追加:

```typescript
async findAll(): Promise<MessageTemplate[]> {
  const rows = await this.sheetsClient.readRows();
  return rows
    .filter((r) => (r[COL.type] ?? '').trim().length > 0)
    .map((row) => {
      const typeValue = (row[COL.type] ?? '').trim();
      const content = (row[COL.content] ?? '').trim();
      const type = new MessageTemplateType(typeValue);
      return {
        id: (row[COL.id] ?? '').trim() || `custom-${typeValue}`,
        type,
        content,
        variables: extractVariables(content),
      };
    });
}

async saveAll(templates: MessageTemplate[]): Promise<void> {
  const rows = templates.map((t) => [t.type.value, t.id, t.content]);
  await this.sheetsClient.clearRows();
  if (rows.length > 0) {
    await this.sheetsClient.writeRows(rows);
  }
}
```

- [ ] **Step 7: 既存テストがコンパイルエラーなく通ることを確認**

Run: `npx vitest run src/infrastructure/adapters/persistence/__tests__/`
Expected: 既存テスト全件 PASS（新メソッドのテストは Task 3-5 の Supabase リポジトリテスト内で間接的にカバー）

- [ ] **Step 8: Commit**

```bash
git add src/domain/ports/ src/infrastructure/adapters/persistence/
git commit -m "feat: ポートに findAll/saveAll を追加し、スプシリポジトリに実装"
```

---

## Task 3: SupabaseOrderRepository

**Files:**
- Create: `src/infrastructure/adapters/persistence/SupabaseOrderRepository.ts`
- Test: `src/infrastructure/adapters/persistence/__tests__/SupabaseOrderRepository.test.ts`

**Docs to check:**
- `src/infrastructure/adapters/persistence/SupabaseOrderSyncRepository.ts` — Order→Row 変換の参考
- `src/infrastructure/adapters/persistence/SpreadsheetOrderRepository.ts` — deserialize パターンの参考
- `supabase/migrations/001_create_tables.sql` — orders テーブルスキーマ

- [ ] **Step 1: Write the failing tests**

```typescript
// src/infrastructure/adapters/persistence/__tests__/SupabaseOrderRepository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseOrderRepository } from '../SupabaseOrderRepository';
import { Order } from '@/domain/entities/Order';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { Platform } from '@/domain/valueObjects/Platform';
import { Buyer } from '@/domain/valueObjects/Buyer';
import { BuyerName } from '@/domain/valueObjects/BuyerName';
import { Address } from '@/domain/valueObjects/Address';
import { PostalCode } from '@/domain/valueObjects/PostalCode';
import { Prefecture } from '@/domain/valueObjects/Prefecture';
import { Product } from '@/domain/valueObjects/Product';

function createMockSupabase() {
  const data: Record<string, unknown[]> = {};
  const mockFrom = vi.fn((table: string) => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      single: vi.fn(),
      then: vi.fn(),
    };
    return builder;
  });
  return { from: mockFrom } as unknown;
}

function createTestOrder(overrides: Partial<{
  orderId: string;
  status: string;
  buyerName: string;
}> = {}): Order {
  return Order.reconstitute({
    orderId: new OrderId(overrides.orderId ?? 'M-test-001'),
    platform: new Platform('minne'),
    buyer: new Buyer({
      name: new BuyerName(overrides.buyerName ?? 'テスト太郎'),
      address: new Address({
        postalCode: new PostalCode('1000001'),
        prefecture: new Prefecture('東京都'),
        city: '千代田区',
        street: '1-1-1',
      }),
    }),
    products: [new Product({ name: 'テスト商品', price: 1000, quantity: 1 })],
    status: new OrderStatus(overrides.status ?? 'pending'),
    orderedAt: new Date('2026-01-01T00:00:00Z'),
    clickPostItemName: 'テスト商品',
  });
}

describe('SupabaseOrderRepository', () => {
  // テストは以下を検証:
  // - save(): upsert が正しい行データで呼ばれる
  // - findById(): select + eq で正しいIDが渡される
  // - findByStatus(): select + eq で正しいステータスが渡される
  // - findAll(): select が引数なしで呼ばれる
  // - exists(): findById の結果が null でなければ true
  // - findByBuyerName(): ilike で部分一致検索される
  // - saveAll(): upsert がバッチで呼ばれる

  it('save() は orders テーブルに upsert する', async () => {
    // Supabase クライアントモックのセットアップと検証
    // 具体的な実装は SupabaseOrderSyncRepository の OrderRow 変換を参考に
  });
});
```

**Note:** テストの具体的な実装は、`SupabaseOrderSyncRepository` の `OrderRow` 型と変換ロジックを再利用するため、実装と並行して書く。各メソッド（save, findById, findByStatus, findAll, exists, findByBuyerName, saveAll）につき最低1テスト。

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/infrastructure/adapters/persistence/__tests__/SupabaseOrderRepository.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

`src/infrastructure/adapters/persistence/SupabaseOrderRepository.ts`:

- `SupabaseOrderSyncRepository` の `OrderRow` 型と `toRow()` 変換ロジックを再利用
- `fromRow()` は `SpreadsheetOrderRepository.deserializeGroup()` のパターンを参考に、DB行 → Order エンティティへ変換
- `products_json` カラムから Product[] を復元
- 全メソッド実装: `findById`, `findByStatus`, `findByBuyerName`, `findAll`, `save`, `saveAll`, `exists`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_CLICK_POST_ITEM_NAME, Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import { Platform } from '@/domain/valueObjects/Platform';
import { Buyer } from '@/domain/valueObjects/Buyer';
import { BuyerName } from '@/domain/valueObjects/BuyerName';
import { Address } from '@/domain/valueObjects/Address';
import { PostalCode } from '@/domain/valueObjects/PostalCode';
import { Prefecture } from '@/domain/valueObjects/Prefecture';
import { Product } from '@/domain/valueObjects/Product';
import { PhoneNumber } from '@/domain/valueObjects/PhoneNumber';
import { ShippingMethod } from '@/domain/valueObjects/ShippingMethod';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';

// OrderRow 型は SupabaseOrderSyncRepository と同じ構造
interface OrderRow { /* ... same as SupabaseOrderSyncRepository */ }

export class SupabaseOrderRepository implements OrderRepository<Order> {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(orderId: OrderId): Promise<Order | null> {
    const { data, error } = await this.supabase
      .from('orders').select('*').eq('order_id', orderId.toString()).single();
    if (error || !data) return null;
    return this.fromRow(data as OrderRow);
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const { data, error } = await this.supabase
      .from('orders').select('*').eq('status', status.toString());
    if (error || !data) return [];
    return (data as OrderRow[]).map((row) => this.fromRow(row));
  }

  async findByBuyerName(name: string): Promise<Order[]> {
    const { data, error } = await this.supabase
      .from('orders').select('*').ilike('buyer_name', `%${name.trim()}%`);
    if (error || !data) return [];
    return (data as OrderRow[]).map((row) => this.fromRow(row));
  }

  async findAll(): Promise<Order[]> {
    const { data, error } = await this.supabase.from('orders').select('*');
    if (error || !data) return [];
    return (data as OrderRow[]).map((row) => this.fromRow(row));
  }

  async save(order: Order): Promise<void> {
    const row = this.toRow(order);
    const { error } = await this.supabase.from('orders').upsert(row, { onConflict: 'order_id' });
    if (error) throw new Error(`Order save failed: ${error.message}`);
  }

  async saveAll(orders: Order[]): Promise<void> {
    if (orders.length === 0) return;
    const rows = orders.map((o) => this.toRow(o));
    const { error } = await this.supabase.from('orders').upsert(rows, { onConflict: 'order_id' });
    if (error) throw new Error(`Order saveAll failed: ${error.message}`);
  }

  async exists(orderId: OrderId): Promise<boolean> {
    const order = await this.findById(orderId);
    return order !== null;
  }

  private toRow(order: Order): OrderRow { /* SupabaseOrderSyncRepository と同じ変換 */ }
  private fromRow(row: OrderRow): Order { /* DB行 → Order 復元 */ }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/infrastructure/adapters/persistence/__tests__/SupabaseOrderRepository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/adapters/persistence/SupabaseOrderRepository.ts src/infrastructure/adapters/persistence/__tests__/SupabaseOrderRepository.test.ts
git commit -m "feat: SupabaseOrderRepository を実装"
```

---

## Task 4: SupabaseShippingLabelRepository

**Files:**
- Create: `src/infrastructure/adapters/persistence/SupabaseShippingLabelRepository.ts`
- Test: `src/infrastructure/adapters/persistence/__tests__/SupabaseShippingLabelRepository.test.ts`

**Docs to check:**
- `src/infrastructure/adapters/persistence/SupabaseOrderSyncRepository.ts` — ShippingLabelRow 型の参考
- `src/infrastructure/adapters/persistence/SpreadsheetShippingLabelRepository.ts` — deserialize パターン
- `src/domain/entities/ClickPostLabel.ts`, `src/domain/entities/YamatoCompactLabel.ts` — コンストラクタ引数

- [ ] **Step 1: Write failing tests**

各メソッド（findById, findByOrderId, findAll, save, saveAll）の正常系テスト + ClickPostLabel/YamatoCompactLabel の型判別テスト。

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/infrastructure/adapters/persistence/__tests__/SupabaseShippingLabelRepository.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/infrastructure/adapters/persistence/SupabaseShippingLabelRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { ShippingLabel } from '@/domain/entities/ShippingLabel';
import { ClickPostLabel } from '@/domain/entities/ClickPostLabel';
import { YamatoCompactLabel } from '@/domain/entities/YamatoCompactLabel';
import { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import { LabelId } from '@/domain/valueObjects/LabelId';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { TrackingNumber } from '@/domain/valueObjects/TrackingNumber';

// ShippingLabelRow は SupabaseOrderSyncRepository と同じ構造

export class SupabaseShippingLabelRepository implements ShippingLabelRepository<ShippingLabel> {
  constructor(private readonly supabase: SupabaseClient) {}
  // findById, findByOrderId, findAll, save, saveAll を実装
  // toRow: SupabaseOrderSyncRepository の upsertShippingLabels と同じ変換
  // fromRow: type 列で ClickPostLabel / YamatoCompactLabel を判別して生成
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/infrastructure/adapters/persistence/__tests__/SupabaseShippingLabelRepository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/adapters/persistence/SupabaseShippingLabelRepository.ts src/infrastructure/adapters/persistence/__tests__/SupabaseShippingLabelRepository.test.ts
git commit -m "feat: SupabaseShippingLabelRepository を実装"
```

---

## Task 5: SupabaseMessageTemplateRepository

**Files:**
- Create: `src/infrastructure/adapters/persistence/SupabaseMessageTemplateRepository.ts`
- Test: `src/infrastructure/adapters/persistence/__tests__/SupabaseMessageTemplateRepository.test.ts`

**Docs to check:**
- `src/domain/services/MessageGenerator.ts` — MessageTemplate インターフェース
- `src/infrastructure/adapters/persistence/SpreadsheetMessageTemplateRepository.ts` — DEFAULT_TEMPLATES, extractVariables の参考

- [ ] **Step 1: Write failing tests**

各メソッド（findByType, findAll, save, saveAll, resetToDefault）のテスト。

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/infrastructure/adapters/persistence/__tests__/SupabaseMessageTemplateRepository.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/infrastructure/adapters/persistence/SupabaseMessageTemplateRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import { MessageTemplate } from '@/domain/services/MessageGenerator';
import { MessageTemplateType } from '@/domain/valueObjects/MessageTemplateType';

// DEFAULT_TEMPLATES は SpreadsheetMessageTemplateRepository と同じものを共有する
// → 共通定数として切り出すか、import して使用する

export class SupabaseMessageTemplateRepository implements MessageTemplateRepository<MessageTemplate> {
  constructor(private readonly supabase: SupabaseClient) {}
  // findByType, findAll, save, saveAll, resetToDefault を実装
}
```

**Note:** `DEFAULT_TEMPLATES` と `extractVariables` を `SpreadsheetMessageTemplateRepository` から共有する必要がある。共通ユーティリティとして別ファイルに切り出すか、同じ定数を再定義する。スプシリポジトリの変更を最小限にするため、`src/infrastructure/adapters/persistence/messageTemplateDefaults.ts` に切り出す。

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/infrastructure/adapters/persistence/__tests__/SupabaseMessageTemplateRepository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/adapters/persistence/SupabaseMessageTemplateRepository.ts src/infrastructure/adapters/persistence/__tests__/SupabaseMessageTemplateRepository.test.ts src/infrastructure/adapters/persistence/messageTemplateDefaults.ts
git commit -m "feat: SupabaseMessageTemplateRepository を実装"
```

---

## Task 6: DualWriteOrderRepository（デコレーター）

**Files:**
- Create: `src/infrastructure/adapters/persistence/DualWriteOrderRepository.ts`
- Test: `src/infrastructure/adapters/persistence/__tests__/DualWriteOrderRepository.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/infrastructure/adapters/persistence/__tests__/DualWriteOrderRepository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DualWriteOrderRepository } from '../DualWriteOrderRepository';
import type { OrderRepository } from '@/domain/ports/OrderRepository';
import type { Order } from '@/domain/entities/Order';
import type { Logger } from '@/infrastructure/logging/Logger';

function createMockRepository(): OrderRepository<Order> {
  return {
    findById: vi.fn(),
    findByStatus: vi.fn(),
    findByBuyerName: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    saveAll: vi.fn(),
    exists: vi.fn(),
  };
}

function createMockLogger(): Logger {
  return { warn: vi.fn(), error: vi.fn() };
}

describe('DualWriteOrderRepository', () => {
  let primary: OrderRepository<Order>;
  let secondary: OrderRepository<Order>;
  let logger: Logger;
  let repo: DualWriteOrderRepository;

  beforeEach(() => {
    primary = createMockRepository();
    secondary = createMockRepository();
    logger = createMockLogger();
    repo = new DualWriteOrderRepository(primary, secondary, logger);
  });

  describe('読み取り操作', () => {
    it('findById は primary のみ呼ぶ', async () => {
      await repo.findById({} as any);
      expect(primary.findById).toHaveBeenCalled();
      expect(secondary.findById).not.toHaveBeenCalled();
    });

    it('findByStatus は primary のみ呼ぶ', async () => {
      await repo.findByStatus({} as any);
      expect(primary.findByStatus).toHaveBeenCalled();
      expect(secondary.findByStatus).not.toHaveBeenCalled();
    });

    it('findByBuyerName は primary のみ呼ぶ', async () => {
      await repo.findByBuyerName('test');
      expect(primary.findByBuyerName).toHaveBeenCalled();
      expect(secondary.findByBuyerName).not.toHaveBeenCalled();
    });

    it('findAll は primary のみ呼ぶ', async () => {
      await repo.findAll();
      expect(primary.findAll).toHaveBeenCalled();
      expect(secondary.findAll).not.toHaveBeenCalled();
    });

    it('exists は primary のみ呼ぶ', async () => {
      await repo.exists({} as any);
      expect(primary.exists).toHaveBeenCalled();
      expect(secondary.exists).not.toHaveBeenCalled();
    });
  });

  describe('書き込み操作', () => {
    it('save は primary と secondary の両方に書く', async () => {
      const order = {} as Order;
      await repo.save(order);
      expect(primary.save).toHaveBeenCalledWith(order);
      expect(secondary.save).toHaveBeenCalledWith(order);
    });

    it('save で secondary が失敗してもエラーにならない', async () => {
      vi.mocked(secondary.save).mockRejectedValue(new Error('DB error'));
      await expect(repo.save({} as Order)).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('save で primary が失敗したらエラーが伝播する', async () => {
      vi.mocked(primary.save).mockRejectedValue(new Error('Sheet error'));
      await expect(repo.save({} as Order)).rejects.toThrow('Sheet error');
      expect(secondary.save).not.toHaveBeenCalled();
    });

    it('saveAll は primary と secondary の両方に書く', async () => {
      const orders = [{} as Order];
      await repo.saveAll(orders);
      expect(primary.saveAll).toHaveBeenCalledWith(orders);
      expect(secondary.saveAll).toHaveBeenCalledWith(orders);
    });

    it('saveAll で secondary が失敗してもエラーにならない', async () => {
      vi.mocked(secondary.saveAll).mockRejectedValue(new Error('DB error'));
      await expect(repo.saveAll([])).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/infrastructure/adapters/persistence/__tests__/DualWriteOrderRepository.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/infrastructure/adapters/persistence/DualWriteOrderRepository.ts
import { Order } from '@/domain/entities/Order';
import { OrderRepository } from '@/domain/ports/OrderRepository';
import { OrderId } from '@/domain/valueObjects/OrderId';
import { OrderStatus } from '@/domain/valueObjects/OrderStatus';
import type { Logger } from '@/infrastructure/logging/Logger';

export class DualWriteOrderRepository implements OrderRepository<Order> {
  constructor(
    private readonly primary: OrderRepository<Order>,
    private readonly secondary: OrderRepository<Order>,
    private readonly logger: Logger,
  ) {}

  async findById(orderId: OrderId): Promise<Order | null> {
    return this.primary.findById(orderId);
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return this.primary.findByStatus(status);
  }

  async findByBuyerName(name: string): Promise<Order[]> {
    return this.primary.findByBuyerName(name);
  }

  async findAll(): Promise<Order[]> {
    return this.primary.findAll();
  }

  async save(order: Order): Promise<void> {
    await this.primary.save(order);
    try {
      await this.secondary.save(order);
    } catch (e) {
      this.logger.warn('Secondary write failed (Order.save)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async saveAll(orders: Order[]): Promise<void> {
    await this.primary.saveAll(orders);
    try {
      await this.secondary.saveAll(orders);
    } catch (e) {
      this.logger.warn('Secondary write failed (Order.saveAll)', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async exists(orderId: OrderId): Promise<boolean> {
    return this.primary.exists(orderId);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/infrastructure/adapters/persistence/__tests__/DualWriteOrderRepository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/adapters/persistence/DualWriteOrderRepository.ts src/infrastructure/adapters/persistence/__tests__/DualWriteOrderRepository.test.ts
git commit -m "feat: DualWriteOrderRepository デコレーターを実装"
```

---

## Task 7: DualWriteShippingLabelRepository（デコレーター）

**Files:**
- Create: `src/infrastructure/adapters/persistence/DualWriteShippingLabelRepository.ts`
- Test: `src/infrastructure/adapters/persistence/__tests__/DualWriteShippingLabelRepository.test.ts`

- [ ] **Step 1: Write failing tests**

Task 6 と同じパターン。読み取り（findById, findByOrderId, findAll）は primary のみ、書き込み（save, saveAll）は両方、secondary 失敗はログのみ。

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/infrastructure/adapters/persistence/__tests__/DualWriteShippingLabelRepository.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

Task 6 と同じデコレーターパターンで `ShippingLabelRepository<ShippingLabel>` を実装。

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/infrastructure/adapters/persistence/__tests__/DualWriteShippingLabelRepository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/adapters/persistence/DualWriteShippingLabelRepository.ts src/infrastructure/adapters/persistence/__tests__/DualWriteShippingLabelRepository.test.ts
git commit -m "feat: DualWriteShippingLabelRepository デコレーターを実装"
```

---

## Task 8: DualWriteMessageTemplateRepository（デコレーター）

**Files:**
- Create: `src/infrastructure/adapters/persistence/DualWriteMessageTemplateRepository.ts`
- Test: `src/infrastructure/adapters/persistence/__tests__/DualWriteMessageTemplateRepository.test.ts`

- [ ] **Step 1: Write failing tests**

Task 6 と同じパターン。読み取り（findByType, findAll）は primary のみ、書き込み（save, saveAll, resetToDefault）は両方、secondary 失敗はログのみ。

**Note:** `resetToDefault` は primary を呼んで結果を取得し、その結果で secondary の save を呼ぶ。

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/infrastructure/adapters/persistence/__tests__/DualWriteMessageTemplateRepository.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// resetToDefault の実装に注意:
async resetToDefault(type: MessageTemplateType): Promise<MessageTemplate> {
  const template = await this.primary.resetToDefault(type);
  try {
    await this.secondary.save(template);
  } catch (e) {
    this.logger.warn('Secondary write failed (MessageTemplate.resetToDefault)', {
      error: e instanceof Error ? e.message : String(e),
    });
  }
  return template;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/infrastructure/adapters/persistence/__tests__/DualWriteMessageTemplateRepository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/adapters/persistence/DualWriteMessageTemplateRepository.ts src/infrastructure/adapters/persistence/__tests__/DualWriteMessageTemplateRepository.test.ts
git commit -m "feat: DualWriteMessageTemplateRepository デコレーターを実装"
```

---

## Task 9: DIコンテナの変更

**Files:**
- Modify: `src/infrastructure/di/container.ts`
- Test: `src/infrastructure/di/__tests__/container.test.ts` (既存があれば追加、なければ新規)

- [ ] **Step 1: container.ts に Supabase クライアント生成のヘルパーを追加**

既存の `getSyncOrdersToDbUseCase` 内で毎回作っている Supabase クライアント生成を、`createContainer` の先頭で一度だけ行うように変更:

```typescript
// createContainer() 内の先頭
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabaseClient = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
```

- [ ] **Step 2: OrderRepository をデコレーターでラップ**

```typescript
import { SupabaseOrderRepository } from '@/infrastructure/adapters/persistence/SupabaseOrderRepository';
import { DualWriteOrderRepository } from '@/infrastructure/adapters/persistence/DualWriteOrderRepository';
import { ConsoleLogger } from '@/infrastructure/logging/Logger';

const logger = new ConsoleLogger();
const spreadsheetOrderRepo = createOrderRepository(env);

const orderRepository: OrderRepository<Order> = supabaseClient
  ? new DualWriteOrderRepository(
      spreadsheetOrderRepo,
      new SupabaseOrderRepository(supabaseClient),
      logger,
    )
  : spreadsheetOrderRepo;
```

- [ ] **Step 3: ShippingLabelRepository をデコレーターでラップ**

ShippingLabel 用のスプシリポジトリを `createContainer` 内で生成し、デコレーターでラップ。

```typescript
import { SupabaseShippingLabelRepository } from '@/infrastructure/adapters/persistence/SupabaseShippingLabelRepository';
import { DualWriteShippingLabelRepository } from '@/infrastructure/adapters/persistence/DualWriteShippingLabelRepository';

const labelSheetsClient = new GoogleSheetsClient({
  spreadsheetId,
  sheetName: env.GOOGLE_SHEETS_LABEL_SHEET_NAME?.trim() || 'ShippingLabels',
  ...auth,
});
const spreadsheetLabelRepo = new SpreadsheetShippingLabelRepository(labelSheetsClient);

const shippingLabelRepository: ShippingLabelRepository<ShippingLabel> = supabaseClient
  ? new DualWriteShippingLabelRepository(
      spreadsheetLabelRepo,
      new SupabaseShippingLabelRepository(supabaseClient),
      logger,
    )
  : spreadsheetLabelRepo;
```

- [ ] **Step 4: MessageTemplateRepository をデコレーターでラップ**

```typescript
import { SupabaseMessageTemplateRepository } from '@/infrastructure/adapters/persistence/SupabaseMessageTemplateRepository';
import { DualWriteMessageTemplateRepository } from '@/infrastructure/adapters/persistence/DualWriteMessageTemplateRepository';

const spreadsheetTemplateRepo = createTemplateRepository(env);

const templateRepository: MessageTemplateRepository<MessageTemplate> = supabaseClient
  ? new DualWriteMessageTemplateRepository(
      spreadsheetTemplateRepo,
      new SupabaseMessageTemplateRepository(supabaseClient),
      logger,
    )
  : spreadsheetTemplateRepo;
```

- [ ] **Step 5: IssueShippingLabelUseCase のDIを修正**

`createIssueShippingLabelUseCase` が独自にスプシリポジトリを生成している問題を修正。共有のデコレーター済みリポジトリを受け取るようにする:

```typescript
function createIssueShippingLabelUseCase(
  env: Env,
  orderRepository: OrderRepository<Order>,
  shippingLabelRepository: ShippingLabelRepository<ShippingLabel>,
): IssueShippingLabelUseCase {
  // ... browserFactory, clickPostGateway, yamatoGateway は既存のまま ...
  const issuer = new ShippingLabelIssuerImpl(clickPostGateway, yamatoGateway);
  return new IssueShippingLabelUseCase(orderRepository, shippingLabelRepository, issuer);
}

// createContainer 内:
getIssueShippingLabelUseCase: () =>
  createIssueShippingLabelUseCase(env, orderRepository, shippingLabelRepository),
```

- [ ] **Step 6: Container インターフェースに getRestoreFromDbUseCase を追加**

```typescript
export interface Container {
  // ... 既存メソッド ...
  getRestoreFromDbUseCase(): RestoreFromDbUseCase;
}
```

（実装は Task 10 で `RestoreFromDbUseCase` を作成後に接続）

- [ ] **Step 7: 全テスト実行**

Run: `npx vitest run`
Expected: 全件 PASS

- [ ] **Step 8: Commit**

```bash
git add src/infrastructure/di/container.ts
git commit -m "feat: DIコンテナにデュアルライト・デコレーターを注入"
```

---

## Task 10: RestoreFromDbUseCase

**Files:**
- Create: `src/application/usecases/RestoreFromDbUseCase.ts`
- Test: `src/application/usecases/__tests__/RestoreFromDbUseCase.test.ts`
- Modify: `src/infrastructure/di/container.ts` — getRestoreFromDbUseCase の実装を接続

- [ ] **Step 1: Write failing tests**

```typescript
// src/application/usecases/__tests__/RestoreFromDbUseCase.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RestoreFromDbUseCase } from '../RestoreFromDbUseCase';

describe('RestoreFromDbUseCase', () => {
  it('注文 → 伝票 → テンプレートの順で復元する', async () => {
    const callOrder: string[] = [];

    const sourceOrderRepo = {
      findAll: vi.fn().mockResolvedValue([]),
      // 他メソッドはモック
    };
    const targetOrderRepo = {
      saveAll: vi.fn().mockImplementation(async () => { callOrder.push('orders'); }),
    };
    const sourceLabelRepo = {
      findAll: vi.fn().mockResolvedValue([]),
    };
    const targetLabelRepo = {
      saveAll: vi.fn().mockImplementation(async () => { callOrder.push('labels'); }),
    };
    const sourceTemplateRepo = {
      findAll: vi.fn().mockResolvedValue([]),
    };
    const targetTemplateRepo = {
      saveAll: vi.fn().mockImplementation(async () => { callOrder.push('templates'); }),
    };

    const useCase = new RestoreFromDbUseCase(
      sourceOrderRepo as any,
      targetOrderRepo as any,
      sourceLabelRepo as any,
      targetLabelRepo as any,
      sourceTemplateRepo as any,
      targetTemplateRepo as any,
    );

    await useCase.execute();

    expect(callOrder).toEqual(['orders', 'labels', 'templates']);
  });

  it('伝票復元で失敗したら停止してエラーを報告する', async () => {
    const sourceOrderRepo = { findAll: vi.fn().mockResolvedValue([]) };
    const targetOrderRepo = { saveAll: vi.fn() };
    const sourceLabelRepo = { findAll: vi.fn().mockRejectedValue(new Error('DB error')) };
    const targetLabelRepo = { saveAll: vi.fn() };
    const sourceTemplateRepo = { findAll: vi.fn().mockResolvedValue([]) };
    const targetTemplateRepo = { saveAll: vi.fn() };

    const useCase = new RestoreFromDbUseCase(
      sourceOrderRepo as any, targetOrderRepo as any,
      sourceLabelRepo as any, targetLabelRepo as any,
      sourceTemplateRepo as any, targetTemplateRepo as any,
    );

    const result = await useCase.execute();
    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('shippingLabels');
    expect(targetTemplateRepo.saveAll).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/application/usecases/__tests__/RestoreFromDbUseCase.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// src/application/usecases/RestoreFromDbUseCase.ts
import type { OrderRepository } from '@/domain/ports/OrderRepository';
import type { ShippingLabelRepository } from '@/domain/ports/ShippingLabelRepository';
import type { MessageTemplateRepository } from '@/domain/ports/MessageTemplateRepository';
import type { Order } from '@/domain/entities/Order';
import type { ShippingLabel } from '@/domain/entities/ShippingLabel';
import type { MessageTemplate } from '@/domain/services/MessageGenerator';

export interface RestoreResult {
  success: boolean;
  failedStep?: 'orders' | 'shippingLabels' | 'messageTemplates';
  error?: string;
  restoredCounts: {
    orders: number;
    shippingLabels: number;
    messageTemplates: number;
  };
}

export class RestoreFromDbUseCase {
  constructor(
    private readonly sourceOrderRepo: OrderRepository<Order>,
    private readonly targetOrderRepo: OrderRepository<Order>,
    private readonly sourceLabelRepo: ShippingLabelRepository<ShippingLabel>,
    private readonly targetLabelRepo: ShippingLabelRepository<ShippingLabel>,
    private readonly sourceTemplateRepo: MessageTemplateRepository<MessageTemplate>,
    private readonly targetTemplateRepo: MessageTemplateRepository<MessageTemplate>,
  ) {}

  async execute(): Promise<RestoreResult> {
    const counts = { orders: 0, shippingLabels: 0, messageTemplates: 0 };

    try {
      const orders = await this.sourceOrderRepo.findAll();
      await this.targetOrderRepo.saveAll(orders);
      counts.orders = orders.length;
    } catch (e) {
      return { success: false, failedStep: 'orders', error: String(e), restoredCounts: counts };
    }

    try {
      const labels = await this.sourceLabelRepo.findAll();
      await this.targetLabelRepo.saveAll(labels);
      counts.shippingLabels = labels.length;
    } catch (e) {
      return { success: false, failedStep: 'shippingLabels', error: String(e), restoredCounts: counts };
    }

    try {
      const templates = await this.sourceTemplateRepo.findAll();
      await this.targetTemplateRepo.saveAll(templates);
      counts.messageTemplates = templates.length;
    } catch (e) {
      return { success: false, failedStep: 'messageTemplates', error: String(e), restoredCounts: counts };
    }

    return { success: true, restoredCounts: counts };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/application/usecases/__tests__/RestoreFromDbUseCase.test.ts`
Expected: PASS

- [ ] **Step 5: container.ts に getRestoreFromDbUseCase を接続**

```typescript
// createContainer 内:
getRestoreFromDbUseCase: () => {
  if (!supabaseClient) {
    throw new Error('Supabase 設定が不足しています: 復元にはDBが必要です');
  }
  return new RestoreFromDbUseCase(
    new SupabaseOrderRepository(supabaseClient),       // source: DB
    spreadsheetOrderRepo,                              // target: スプシ（デコレーター前）
    new SupabaseShippingLabelRepository(supabaseClient),
    spreadsheetLabelRepo,
    new SupabaseMessageTemplateRepository(supabaseClient),
    spreadsheetTemplateRepo,
  );
},
```

- [ ] **Step 6: 全テスト実行**

Run: `npx vitest run`
Expected: 全件 PASS

- [ ] **Step 7: Commit**

```bash
git add src/application/usecases/RestoreFromDbUseCase.ts src/application/usecases/__tests__/RestoreFromDbUseCase.test.ts src/infrastructure/di/container.ts
git commit -m "feat: RestoreFromDbUseCase を実装し、DIコンテナに接続"
```

---

## Task 11: 全体結合テスト + lint/format 確認

**Files:** なし（既存コード全体の検証）

- [ ] **Step 1: 全テスト実行**

Run: `npx vitest run`
Expected: 全件 PASS

- [ ] **Step 2: lint 実行**

Run: `npm run lint`
Expected: エラーなし

- [ ] **Step 3: format 実行**

Run: `npm run format`
Expected: 差分なし

- [ ] **Step 4: TypeScript コンパイルチェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 5: 最終コミット（差分があれば）**

```bash
git add -A
git commit -m "chore: lint/format 修正"
```
