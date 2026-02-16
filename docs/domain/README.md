# ドメインモデル

## 概要

松岡幸一郎氏の「ドメイン駆動設計入門」に基づき、ハンドメイド発送管理システムのドメインモデルを定義します。

## ユビキタス言語（Ubiquitous Language）

| 用語 | 英語 | 定義 |
|-----|------|------|
| 注文 | Order | ハンドメイドプラットフォームでの購入を表す |
| 購入者 | Buyer | 作品を購入した人 |
| 作家 | Creator | ハンドメイド作品を制作・販売する人 |
| 伝票 | Shipping Label | 配送に使用する送り状 |
| 発送 | Shipment | 作品を購入者に送ること |
| プラットフォーム | Platform | minne、creemaなどの販売サイト |
| クリックポスト | Click Post | 日本郵便の配送サービス |
| 宅急便コンパクト | Takkyubin Compact | ヤマト運輸の配送サービス |
| PUDO | PUDO | 宅配便ロッカー |

## ER図

```mermaid
erDiagram
    Order ||--|| Buyer : contains
    Order ||--o{ ShippingLabel : has
    Buyer ||--|| Address : contains
    Order ||--|| Product : contains
    ShippingLabel ||--o| ClickPostLabel : extends
    ShippingLabel ||--o| YamatoCompactLabel : extends

    Order {
        string order_id PK
        string platform
        string status
        datetime ordered_at
        datetime shipped_at
        string shipping_method
        string tracking_number
    }

    Buyer {
        string name
        string phone_number
    }

    Address {
        string postal_code
        string prefecture
        string city
        string street
        string building
    }

    Product {
        string name
        float price
    }

    ShippingLabel {
        string label_id PK
        string order_id FK
        string type
        string status
        datetime issued_at
        datetime expires_at
    }

    ClickPostLabel {
        string label_id PK
        string pdf_data
        string tracking_number
    }

    YamatoCompactLabel {
        string label_id PK
        string qr_code
        string waybill_number
    }

    MessageTemplate {
        string id PK "※集約ではなく設定/読み取りモデル"
        string type "purchase_thanks / shipping_notice"
        string content
        string variables "利用可能な変数リスト"
    }

    Order ..o| MessageTemplate : "MessageGeneratorが参照"
```

## コンテキストマップ

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         発送管理システム                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐           ┌─────────────────────┐            │
│  │    注文管理          │           │    配送管理          │            │
│  │   (Order Context)    │◄─────────►│  (Shipping Context)  │            │
│  │                     │           │                     │            │
│  │  - Order            │           │  - ShippingLabel    │            │
│  │  - Buyer            │           │  - ClickPost        │            │
│  │  - Product          │           │  - YamatoCompact    │            │
│  └─────────────────────┘           └─────────────────────┘            │
│           ▲                                  ▲                        │
│           │                                  │                        │
│           ▼                                  ▼                        │
│  ┌─────────────────────┐           ┌─────────────────────┐            │
│  │   通知管理           │           │    外部連携          │            │
│  │ (Notification)      │           │  (External)         │            │
│  │                     │           │                     │            │
│  │  - SlackNotifier    │           │  - GmailAdapter     │            │
│  └─────────────────────┘           │  - SpreadsheetRepo  │            │
│                                    │  - PlatformScraper  │            │
│                                    │  - ClickPostClient  │            │
│                                    │  - YamatoClient     │            │
│                                    └─────────────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 集約（Aggregates）

### Order集約（注文集約）

注文を中心とした集約。購入者情報と商品情報を含む。

```
┌─────────────────────────────────────────────────┐
│ <<Aggregate Root>>                              │
│ Order（注文）                                    │
├─────────────────────────────────────────────────┤
│ - orderId: OrderId                              │
│ - platform: Platform                            │
│ - buyer: Buyer                                  │
│ - product: Product                              │
│ - status: OrderStatus                           │
│ - orderedAt: DateTime                           │
│ - shippedAt: DateTime?                          │
│ - shippingMethod: ShippingMethod?               │
│ - trackingNumber: TrackingNumber?               │
├─────────────────────────────────────────────────┤
│ + markAsShipped(method, trackingNumber?)        │
│ + isOverdue(): boolean                          │
│ + getDaysSinceOrder(): number                   │
└─────────────────────────────────────────────────┘
          │
          │ contains
          ▼
┌─────────────────────────────────────────────────┐
│ <<Value Object>>                                │
│ Buyer（購入者）                                  │
├─────────────────────────────────────────────────┤
│ - name: BuyerName                               │
│ - address: Address                              │
│ - phoneNumber: PhoneNumber?                     │
└─────────────────────────────────────────────────┘
          │
          │ contains
          ▼
┌─────────────────────────────────────────────────┐
│ <<Value Object>>                                │
│ Address（住所）                                  │
├─────────────────────────────────────────────────┤
│ - postalCode: PostalCode                        │
│ - prefecture: Prefecture                        │
│ - city: string                                  │
│ - street: string                                │
│ - building: string?                             │
├─────────────────────────────────────────────────┤
│ + fullAddress(): string                         │
│ + formatForLabel(): string                      │
└─────────────────────────────────────────────────┘
```

### ShippingLabel集約（伝票集約）

伝票を表す集約。クリックポストと宅急便コンパクトの2種類がある。

```
┌─────────────────────────────────────────────────┐
│ <<Aggregate Root>>                              │
│ ShippingLabel（伝票）                            │
├─────────────────────────────────────────────────┤
│ - labelId: LabelId                              │
│ - orderId: OrderId                              │
│ - type: ShippingLabelType                       │
│ - status: LabelStatus                           │
│ - issuedAt: DateTime                            │
│ - expiresAt: DateTime?                          │
├─────────────────────────────────────────────────┤
│ + isExpired(): boolean                          │
└─────────────────────────────────────────────────┘
          △
          │
    ┌─────┴─────┐
    │           │
┌───┴────────┐   ┌───┴────────────┐
│ClickPostLabel │   │YamatoCompactLabel│
├────────────┤   ├────────────────┤
│- pdfData        │   │- qrCode             │
│- trackingNumber │   │- waybillNumber       │
└─────────────┘   └──────────────────┘
```

## エンティティ（Entities）

| エンティティ | 識別子 | 説明 |
|------------|--------|------|
| Order | OrderId | 注文を表す。ライフサイクルを持つ |
| ShippingLabel | LabelId | 発行された伝票を表す |

## 値オブジェクト（Value Objects）

| 値オブジェクト | 説明 | バリデーションルール |
|--------------|------|-------------------|
| Buyer | 購入者 | 名前、住所、電話番号を含む複合値オブジェクト |
| Address | 住所 | 郵便番号、都道府県、市区町村、番地、建物名 |
| Product | 商品 | 商品名、価格 |
| OrderId | 注文ID | プラットフォーム固有のフォーマット |
| BuyerName | 購入者名 | 空文字不可、100文字以内 |
| PostalCode | 郵便番号 | 7桁の数字（ハイフンなし） |
| Prefecture | 都道府県 | 47都道府県のいずれか |
| PhoneNumber | 電話番号 | 有効な日本の電話番号形式 |
| Platform | プラットフォーム | minne / creema |
| OrderStatus | 注文ステータス | pending / shipped |
| ShippingMethod | 配送方法 | click_post / yamato_compact |
| TrackingNumber | 追跡番号 | 配送方法ごとのフォーマット |
| Message | 生成済みメッセージ | 空文字不可 |
| MessageTemplateType | テンプレート種別 | purchase_thanks / shipping_notice |

## ポート（Ports）

ドメイン層が定義するインターフェース。具体的な実装はインフラストラクチャ層が提供する（依存性逆転）。

### ShippingLabelIssuer（伝票発行ポート）

伝票の発行を担当するポート。ユースケースはこの抽象にのみ依存する。

```typescript
// ドメイン層で定義（Port）
interface ShippingLabelIssuer {
  issue(order: Order, method: ShippingMethod): Promise<ShippingLabel>;
}
```

具体的な配送方法（クリックポスト/宅急便コンパクト）への振り分けは、
インフラストラクチャ層（Composition Root）で行う。ユースケースは具体実装を知らない。

```typescript
// インフラストラクチャ層の実装（Adapter）
interface ClickPostGateway {
  issue(order: Order): Promise<ClickPostLabel>;
}

interface YamatoCompactGateway {
  issue(order: Order): Promise<YamatoCompactLabel>;
}

class ShippingLabelIssuerImpl implements ShippingLabelIssuer {
  constructor(
    private readonly clickPost: ClickPostGateway,
    private readonly yamato: YamatoCompactGateway
  ) {}

  issue(order: Order, method: ShippingMethod): Promise<ShippingLabel> {
    return method === ShippingMethod.ClickPost
      ? this.clickPost.issue(order)
      : this.yamato.issue(order);
  }
}
```

### OrderFetcher（注文取得ポート）

プラットフォームから注文情報を取得するポート。
戻り値は `PlatformOrderData`（生データ）であり、`Order` への変換は `OrderFactory` が担当する。
これにより、インフラ層がドメインオブジェクトを生成する責務を持たない。

```typescript
// ドメイン層で定義（Port）
interface OrderFetcher {
  fetch(orderId: OrderId, platform: Platform): Promise<PlatformOrderData>;
}

// ユースケースでの使い方
// const data = await orderFetcher.fetch(orderId, platform);
// const order = orderFactory.createFromPlatformData(data);

// インフラストラクチャ層で実装（Adapter）
class MinneAdapter implements OrderFetcher {
  async fetch(orderId: OrderId, platform: Platform): Promise<PlatformOrderData> {
    throw new Error("Not implemented");
  }
}

class CreemaAdapter implements OrderFetcher {
  async fetch(orderId: OrderId, platform: Platform): Promise<PlatformOrderData> {
    throw new Error("Not implemented");
  }
}
```

### NotificationSender（通知送信ポート）

通知を送信するポート。

```typescript
// ドメイン層で定義（Port）
interface NotificationSender {
  notify(message: NotificationMessage): Promise<void>;
}

// インフラストラクチャ層で実装（Adapter）
class SlackNotificationAdapter implements NotificationSender {
  async notify(message: NotificationMessage): Promise<void> {
    throw new Error("Not implemented");
  }
}
```

## リポジトリ（Repositories）

### OrderRepository

```typescript
interface OrderRepository {
  findById(orderId: OrderId): Promise<Order | null>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
  findByBuyerName(name: string): Promise<Order[]>;
  save(order: Order): Promise<void>;
  exists(orderId: OrderId): Promise<boolean>;
  findAll(): Promise<Order[]>;
}
```

### ShippingLabelRepository

```typescript
interface ShippingLabelRepository {
  findById(labelId: LabelId): Promise<ShippingLabel | null>;
  findByOrderId(orderId: OrderId): Promise<ShippingLabel[]>;
  save(label: ShippingLabel): Promise<void>;
}
```

## ドメインイベント（Domain Events）

イベントの詳細なフローは[イベントストーミング](./event-storming.md)を参照。

| イベント | 発生タイミング | ハンドラー |
|---------|--------------|-----------|
| PurchaseEmailReceived | Gmailで購入通知メールを検出したとき | FetchOrderUseCase |
| OrderFetched | プラットフォームから注文情報の取得に成功したとき | RegisterOrderPolicy |
| OrderFetchFailed | プラットフォームから注文情報の取得に失敗したとき | SlackErrorNotificationHandler |
| OrderRegistered | 新規注文が登録されたとき | SlackNotificationHandler |
| DuplicateOrderSkipped | 既存の注文IDと重複したとき | （ログ記録のみ） |
| NotificationSent | Slack通知が成功したとき | （なし） |
| NotificationFailed | Slack通知が失敗したとき | （リトライ/ログ記録） |
| ShippingLabelIssued | 伝票が発行されたとき | （将来拡張用） |
| ShippingLabelIssueFailed | 伝票の発行に失敗したとき | （エラー表示） |
| OrderShipped | 注文が発送済みになったとき | （将来拡張用） |
| PurchaseThanksMessageGenerated | 購入お礼メッセージが生成されたとき | （クリップボードコピー） |
| ShippingNoticeMessageGenerated | 発送連絡メッセージが生成されたとき | （クリップボードコピー） |
| MessageTemplateUpdated | 定型文テンプレートが更新されたとき | （即時反映） |

## ファクトリ（Factories）

### OrderFactory

プラットフォームから取得した情報からOrderエンティティを生成する。

```typescript
interface OrderFactory {
  createFromPlatformData(data: PlatformOrderData): Order;
}
```

## ドメインルール（Domain Rules）

ドメインオブジェクトが持つビジネスルール・不変条件を定義します。

### Order（注文）のルール

| ルールID | ルール名 | 説明 | 実装場所 |
|---------|---------|------|---------|
| DR-ORD-001 | 注文ID一意性 | 同一注文IDの注文は重複登録できない | OrderRepository.save() |
| DR-ORD-002 | 必須項目 | 購入者名、住所、商品名は必須 | Order.create() |
| DR-ORD-003 | ステータス遷移 | pending → shipped への一方向遷移のみ許可 | Order.markAsShipped() |
| DR-ORD-004 | 発送済み変更不可 | 発送済みステータスの注文は変更できない | Order.markAsShipped() |
| DR-ORD-005 | 発送日時記録 | 発送完了時に発送日時を記録する | Order.markAsShipped() |
| DR-ORD-006 | 超過注文警告 | 3日以上経過した未発送注文は警告対象 | OverdueOrderSpecification |

```typescript
class Order {
  markAsShipped(method: ShippingMethod, trackingNumber?: TrackingNumber): void {
    // DR-ORD-003: ステータス遷移チェック
    if (this.status !== OrderStatus.Pending) {
      throw new DomainError('発送済みの注文は変更できません');
    }
    // DR-ORD-005: 発送日時記録
    this.status = OrderStatus.Shipped;
    this.shippedAt = new Date();
    this.shippingMethod = method;
    this.trackingNumber = trackingNumber;
  }
}
```

### ShippingLabel（伝票）のルール

| ルールID | ルール名 | 説明 | 実装場所 |
|---------|---------|------|---------|
| DR-LBL-001 | 有効期限 | 宅急便コンパクトのQRコードは発行から14日間有効 | YamatoCompactLabel |
| DR-LBL-002 | 発送前のみ発行可 | 発送済み注文には伝票を発行できない | IssueShippingLabelUseCase |
| DR-LBL-003 | 重複発行警告 | 同一注文に対する伝票の重複発行は警告を表示 | IssueShippingLabelUseCase |

### Address（住所）のルール

| ルールID | ルール名 | 説明 | 実装場所 |
|---------|---------|------|---------|
| DR-ADR-001 | 郵便番号形式 | 7桁の数字（ハイフンなし）であること | PostalCode |
| DR-ADR-002 | 都道府県 | 47都道府県のいずれかであること | Prefecture |
| DR-ADR-003 | 必須項目 | 郵便番号、都道府県、市区町村、番地は必須 | Address.create() |

### Platform（プラットフォーム）のルール

| ルールID | ルール名 | 説明 | 実装場所 |
|---------|---------|------|---------|
| DR-PLT-001 | 対応プラットフォーム | minne / creema のみ対応 | Platform |

### ShippingMethod（配送方法）のルール

| ルールID | ルール名 | 説明 | 実装場所 |
|---------|---------|------|---------|
| DR-SHP-001 | 対応配送方法 | クリックポスト / 宅急便コンパクト のみ対応 | ShippingMethod |
| DR-SHP-002 | クリックポスト重量制限 | 1kg以下の荷物のみ対応 | ClickPostLabel（将来実装） |

### MessageTemplate（メッセージテンプレート）のルール

| ルールID | ルール名 | 説明 | 実装場所 |
|---------|---------|------|---------|
| DR-MSG-001 | 空テンプレート禁止 | テンプレートは空にできない | MessageTemplate |
| DR-MSG-002 | 変数必須 | テンプレートは最低1つの変数を含む必要がある | MessageTemplate |

## ドメインサービス（Domain Services）

### MessageGenerator（メッセージ生成サービス）

注文情報とテンプレートからメッセージを生成する純粋な変換処理。
Order の責務ではなく、集約をまたぐ処理でもないため、ドメインサービスとして実装する。
（設計判断の詳細は[集約設計](./aggregate-design.md#3-メッセージテンプレートの位置づけ)を参照）

```typescript
// ドメイン層で定義
interface MessageGenerator {
  generate(order: Order, template: MessageTemplate): Message;
}
```

#### 関連するドメインオブジェクト

```
MessageGenerator (ドメインサービス)
├── 入力: Order（集約）
├── 入力: MessageTemplate（設定/読み取りモデル）
└── 出力: Message（値オブジェクト）
```

### MessageTemplate（メッセージテンプレート / 設定）

ユーザーが編集可能な定型文テンプレート。ビジネスルールではなくユーザー設定であるため、
集約ではなく設定/読み取りモデルとして扱う。

```typescript
interface MessageTemplate {
  readonly id: string;
  readonly type: MessageTemplateType;  // 'purchase_thanks' | 'shipping_notice'
  readonly content: string;
  readonly variables: TemplateVariable[];
}

// テンプレートから生成されたメッセージ（値オブジェクト）
class Message {
  readonly content: string;

  constructor(content: string) {
    if (!content || content.trim().length === 0) {
      throw new DomainError('メッセージは空にできません');
    }
    this.content = content;
  }
}
```

### MessageTemplateRepository

```typescript
interface MessageTemplateRepository {
  findByType(type: MessageTemplateType): Promise<MessageTemplate | null>;
  save(template: MessageTemplate): Promise<void>;
  resetToDefault(type: MessageTemplateType): Promise<void>;
}
```

## 仕様（Specifications）

### OverdueOrderSpecification

3日以上経過した未発送注文を判定する仕様。

```typescript
class OverdueOrderSpecification implements Specification<Order> {
  isSatisfiedBy(order: Order): boolean {
    return order.getDaysSinceOrder() >= 3 && order.status === OrderStatus.Pending;
  }
}
```

## 関連ドキュメント

### ドメイン設計
- [イベントストーミング](./event-storming.md) - ドメインイベント、コマンド、ポリシーの可視化
- [集約設計](./aggregate-design.md) - 集約境界の検証と設計判断

### システム設計
- [アーキテクチャ](../architecture/README.md) - ヘキサゴナルアーキテクチャ、レイヤー構成、データフロー
- [ユースケース](../usecases/README.md) - システムのユースケース一覧
