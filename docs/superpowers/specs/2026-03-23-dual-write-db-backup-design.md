# デュアルライト DB バックアップ設計

## 概要

Google Sheets（プライマリ）への書き込み時に、Supabase PostgreSQL（セカンダリ）にも自動で書き込む「デュアルライト・デコレーター」を導入する。スプシが壊れた場合はDBからスプシを復元できるようにする。

## 目的

- **信頼性・バックアップ**: スプシ障害時のデータ損失を防ぐ
- **全データ対象**: 注文・伝票・メッセージテンプレートの3種すべてを同期
- **復元可能性**: DB → スプシの再構築機能を提供

## アーキテクチャ

### デコレーターパターン

既存のスプシリポジトリをデコレーターでラップし、書き込み時にDBにも保存する。

```
[UseCase]
    ↓ (ポート経由)
[DualWriteOrderRepository]  ← デコレーター
    ├── primary:   SpreadsheetOrderRepository
    └── secondary: SupabaseOrderRepository

[DualWriteShippingLabelRepository]  ← デコレーター
    ├── primary:   SpreadsheetShippingLabelRepository
    └── secondary: SupabaseShippingLabelRepository

[DualWriteMessageTemplateRepository]  ← デコレーター
    ├── primary:   SpreadsheetMessageTemplateRepository
    └── secondary: SupabaseMessageTemplateRepository
```

### 動作ルール

| 操作 | 対象 | 失敗時の挙動 |
|------|------|-------------|
| 読み取り | primaryのみ | エラーをそのまま伝播 |
| 書き込み | primary → secondary | primary失敗: エラー伝播。secondary失敗: ログ出力のみ、処理続行 |

### 後方互換性

Supabase環境変数が未設定の場合、デコレーターは適用されず、既存のスプシ単体動作を維持する。

## 新規コンポーネント

### 1. Supabaseリポジトリ（フル実装）

既存の `SupabaseOrderSyncRepository`（upsertのみ）とは別に、各ポートのフル実装を新規作成する。

**SupabaseOrderRepository** (implements `OrderRepository<Order>`)
- `findById`, `findByStatus`, `findByBuyerName`, `findAll`, `save`, `exists`
- 既存 `orders` テーブルを使用
- `products_json` カラムで複数商品を格納

**SupabaseShippingLabelRepository** (implements `ShippingLabelRepository<ShippingLabel>`)
- `findById`, `findByOrderId`, `save`, `findAll`
- 既存 `shipping_labels` テーブルを使用

**SupabaseMessageTemplateRepository** (implements `MessageTemplateRepository<MessageTemplate>`)
- `findByType`, `save`, `resetToDefault`, `findAll`
- 既存 `message_templates` テーブルを使用
- `MessageTemplate` は `{ id, type, content, variables }` 型（`@/domain/services/MessageGenerator` で定義）
- `findAll()` は全行を返す（type の重複は想定しない。`resetToDefault` で既定IDを使うため）

### 型パラメータについて

既存のポートはジェネリック型パラメータを持つ（例: `OrderRepository<TOrder = Order>`）。`ShippingLabelRepository` と `MessageTemplateRepository` のデフォルト型は `unknown` なので、デコレーターおよびSupabaseリポジトリでは明示的に `ShippingLabelRepository<ShippingLabel>`, `MessageTemplateRepository<MessageTemplate>` と型パラメータを指定して実装する。

### 2. デュアルライト・デコレーター

3つのデコレーターは同一パターンで実装する。

```typescript
class DualWriteOrderRepository implements OrderRepository<Order> {
  constructor(
    private primary: OrderRepository<Order>,
    private secondary: OrderRepository<Order>,
    private logger: Logger  // console.warn/console.error のラッパー（infrastructure層内で定義）
  ) {}

  // 読み取り → primaryのみ
  async findById(id: OrderId): Promise<Order | null> {
    return this.primary.findById(id);
  }

  // 書き込み → primary → secondary（失敗はログのみ）
  async save(order: Order): Promise<void> {
    await this.primary.save(order);
    try {
      await this.secondary.save(order);
    } catch (e) {
      this.logger.warn('Secondary write failed (Order)', {
        orderId: order.orderId.value,
        error: e,
      });
    }
  }
}
```

**Logger について**: `Logger` はインフラ層内で定義するシンプルなインターフェース（`warn`, `error` メソッドを持つ）。初期実装は `console` をラップするだけでよい。ドメイン層には依存しない。

**`saveAll()` のデコレーター動作**: デコレーターの `saveAll()` は `save()` と同じパターンで、primaryに書いた後secondaryにも書く（失敗はログのみ）。`RestoreFromDbUseCase` はデコレーターを通さず直接スプシリポジトリの `saveAll()` を使うため、復元時のループは発生しない。

### 3. 復元ユースケース (RestoreFromDbUseCase)

DBからスプシを再構築する。

**復元順序**: FK制約（`shipping_labels.order_id → orders.order_id`）があるため、必ず以下の順序で実行する:

1. **注文を復元** — `SupabaseOrderRepository.findAll()` → `SpreadsheetOrderRepository.saveAll()`
2. **伝票を復元** — `SupabaseShippingLabelRepository.findAll()` → `SpreadsheetShippingLabelRepository.saveAll()`
3. **テンプレートを復元** — `SupabaseMessageTemplateRepository.findAll()` → `SpreadsheetMessageTemplateRepository.saveAll()`

（テンプレートはFK制約がないので順序は任意だが、統一性のため最後に実行）

**注意点:**
- 復元時はデコレーターを通さず、直接スプシリポジトリに書く（DB→スプシ→DBのループ回避）
- DIコンテナで `RestoreFromDbUseCase` にはラップ前のスプシリポジトリを渡す
- UIは管理画面に「DBから復元」ボタンを配置（誤操作防止の確認ダイアログ付き）

## ポートの変更

復元機能のために以下のメソッドを追加する。

- `ShippingLabelRepository` に `findAll(): Promise<ShippingLabel[]>` を追加
  - 既存の `SpreadsheetShippingLabelRepository` に `private findAll()` が存在するので、これを `public` に変更しポートに追加
- `MessageTemplateRepository` に `findAll(): Promise<MessageTemplate[]>` を追加
  - `findAll()` は全行（全テンプレート）を返す
  - `SpreadsheetMessageTemplateRepository` には `findAll()` が存在しないため、新規実装が必要
- `OrderRepository` には既に `findAll()` がある（変更なし）

## 復元用のバッチ書き込み

既存の `SpreadsheetOrderRepository.save()` は1件ごとにシート全体をクリア＆再書き込みする。復元時に `save()` をN回呼ぶとO(N^2)の操作になるため、復元専用のバッチメソッドを追加する。

- 各スプシリポジトリに `saveAll(items: T[]): Promise<void>` メソッドを追加
  - シートをクリアし、全件を一括書き込み（1回のAPI呼び出し）
- ポート（interface）にも `saveAll()` を追加する
- Supabaseリポジトリにも `saveAll()` を実装する（upsert のバッチ処理）

## DIコンテナの変更

`createContainer()` でSupabase設定がある場合にデコレーターを注入する。

```typescript
const spreadsheetOrderRepo = new SpreadsheetOrderRepository(sheetsClient);

let orderRepository: OrderRepository<Order>;
if (supabaseClient) {
  const supabaseOrderRepo = new SupabaseOrderRepository(supabaseClient);
  orderRepository = new DualWriteOrderRepository(
    spreadsheetOrderRepo, supabaseOrderRepo, logger
  );
} else {
  orderRepository = spreadsheetOrderRepo;
}
// ShippingLabel, MessageTemplate も同様
```

`RestoreFromDbUseCase` にはラップ前のスプシリポジトリを直接渡す。

### IssueShippingLabelUseCase のDI修正

現在 `createIssueShippingLabelUseCase` は独自に `SpreadsheetOrderRepository` と `SpreadsheetShippingLabelRepository` を直接生成しており、共有のデコレーター済みインスタンスを使っていない。デコレーターが適用されるよう、`createContainer()` で生成した共有リポジトリインスタンスを注入するようにリファクタリングする。

## 既存の同期機構との関係

### `SupabaseOrderSyncRepository` / `SyncOrdersToDbUseCase`

- デュアルライト導入後、新規データは自動でDBに書き込まれるため、`SyncOrdersToDbUseCase` は新規データに対しては不要になる
- ただし、導入前の既存データをDBに移行する「初回マイグレーション」として引き続き利用する
- **移行パス**: デュアルライト導入 → `SyncOrdersToDbUseCase` で既存データを一括同期 → 以降は `SyncOrdersToDbUseCase` を非推奨化 → 全データ同期確認後に削除

### `synced_at` カラム

デュアルライトではリアルタイム書き込みとなるため、`synced_at` の意味が「バッチ同期日時」から「書き込み日時」に変わる。カラム名はそのまま維持する（実質的にはレコードの最終更新日時として機能する）。

## ファイル構成

```
src/infrastructure/adapters/persistence/
├── SupabaseOrderRepository.ts            (新規)
├── SupabaseShippingLabelRepository.ts    (新規)
├── SupabaseMessageTemplateRepository.ts  (新規)
├── DualWriteOrderRepository.ts           (新規)
├── DualWriteShippingLabelRepository.ts   (新規)
├── DualWriteMessageTemplateRepository.ts (新規)
└── __tests__/
    ├── SupabaseOrderRepository.test.ts
    ├── SupabaseShippingLabelRepository.test.ts
    ├── SupabaseMessageTemplateRepository.test.ts
    ├── DualWriteOrderRepository.test.ts
    ├── DualWriteShippingLabelRepository.test.ts
    └── DualWriteMessageTemplateRepository.test.ts

src/infrastructure/logging/
└── Logger.ts                             (新規: Loggerインターフェース + ConsoleLogger実装)

src/application/usecases/
├── RestoreFromDbUseCase.ts               (新規)
└── __tests__/
    └── RestoreFromDbUseCase.test.ts

src/domain/ports/
├── ShippingLabelRepository.ts            (変更: findAll, saveAll追加)
├── MessageTemplateRepository.ts          (変更: findAll, saveAll追加)
└── OrderRepository.ts                    (変更: saveAll追加)

src/infrastructure/di/
└── container.ts                          (変更: デコレーター注入, IssueShippingLabelUseCase DI修正)
```

## 既存コードへの影響

- **ユースケース層**: 変更なし（ポート経由なのでデコレーターの存在を知らない）
- **既存リポジトリ**: `findAll()` の公開化と `saveAll()` の追加のみ
- **`IssueShippingLabelUseCase` のDI**: 共有リポジトリインスタンスを使うようにリファクタリング
- **`SupabaseOrderSyncRepository`**: そのまま残す（初回マイグレーション用。全データ同期確認後に削除）
- **`SyncOrdersToDbUseCase`**: そのまま残す（同上）

## テスト方針

**デコレーターのテスト:**
- primary/secondaryをモックして、書き込みが両方に呼ばれることを確認
- secondary失敗時にprimaryの結果がそのまま返ることを確認
- 読み取りがprimaryのみであることを確認

**Supabaseリポジトリのテスト:**
- Supabaseクライアントをモックしたユニットテスト
- 各ポートメソッドの正常系・異常系

**復元ユースケースのテスト:**
- DBから全件取得 → スプシに書き込みの流れを確認
- 復元順序（注文 → 伝票 → テンプレート）の確認
- 部分失敗時のハンドリング確認（途中のステップで失敗した場合はそこで停止し、どのステップで失敗したかを報告する。ロールバックは行わない）
