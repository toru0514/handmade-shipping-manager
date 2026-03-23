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

**SupabaseOrderRepository** (implements OrderRepository)
- `findById`, `findByStatus`, `findByBuyerName`, `findAll`, `save`, `exists`
- 既存 `orders` テーブルを使用
- `products_json` カラムで複数商品を格納

**SupabaseShippingLabelRepository** (implements ShippingLabelRepository)
- `findById`, `findByOrderId`, `save`
- 既存 `shipping_labels` テーブルを使用

**SupabaseMessageTemplateRepository** (implements MessageTemplateRepository)
- `findByType`, `save`, `resetToDefault`
- 既存 `message_templates` テーブルを使用

### 2. デュアルライト・デコレーター

3つのデコレーターは同一パターンで実装する。

```typescript
class DualWriteOrderRepository implements OrderRepository {
  constructor(
    private primary: OrderRepository,
    private secondary: OrderRepository,
    private logger: Logger
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

### 3. 復元ユースケース (RestoreFromDbUseCase)

DBからスプシを再構築する。

```
SupabaseOrderRepository.findAll()
  → SpreadsheetOrderRepository.save() (全件)

SupabaseShippingLabelRepository.findAll()
  → SpreadsheetShippingLabelRepository.save() (全件)

SupabaseMessageTemplateRepository.findAll()
  → SpreadsheetMessageTemplateRepository.save() (全件)
```

**注意点:**
- 復元時はデコレーターを通さず、直接スプシリポジトリに書く（DB→スプシ→DBのループ回避）
- DIコンテナで `RestoreFromDbUseCase` にはラップ前のスプシリポジトリを渡す
- UIは管理画面に「DBから復元」ボタンを配置（誤操作防止の確認ダイアログ付き）

## ポートの変更

復元機能のために以下のメソッドを追加する。

- `ShippingLabelRepository` に `findAll(): Promise<ShippingLabel[]>` を追加
- `MessageTemplateRepository` に `findAll(): Promise<MessageTemplate[]>` を追加
- `OrderRepository` には既に `findAll()` がある（変更なし）

## DIコンテナの変更

`createContainer()` でSupabase設定がある場合にデコレーターを注入する。

```typescript
const spreadsheetOrderRepo = new SpreadsheetOrderRepository(sheetsClient);

let orderRepository: OrderRepository;
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

src/application/usecases/
├── RestoreFromDbUseCase.ts               (新規)
└── __tests__/
    └── RestoreFromDbUseCase.test.ts

src/domain/ports/
├── ShippingLabelRepository.ts            (変更: findAll追加)
└── MessageTemplateRepository.ts          (変更: findAll追加)

src/infrastructure/di/
└── container.ts                          (変更: デコレーター注入)
```

## 既存コードへの影響

- **ユースケース層**: 変更なし（ポート経由なのでデコレーターの存在を知らない）
- **既存リポジトリ**: 変更なし
- **`SupabaseOrderSyncRepository`**: そのまま残す（既存データの初回同期に利用可能。将来的にデコレーターで代替後に削除）
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
- 部分失敗時のハンドリング確認
