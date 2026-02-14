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
│ - phoneNumber: PhoneNumber                      │
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
┌───┴───┐   ┌───┴───┐
│ClickPostLabel│   │YamatoCompactLabel│
├───────┤   ├───────┤
│- pdfData│   │- qrCode│
│         │   │- waybillNumber│
└─────────┘   └─────────┘
```

## エンティティ（Entities）

| エンティティ | 識別子 | 説明 |
|------------|--------|------|
| Order | OrderId | 注文を表す。ライフサイクルを持つ |
| ShippingLabel | LabelId | 発行された伝票を表す |

## 値オブジェクト（Value Objects）

| 値オブジェクト | 説明 | バリデーションルール |
|--------------|------|-------------------|
| OrderId | 注文ID | プラットフォーム固有のフォーマット |
| BuyerName | 購入者名 | 空文字不可、100文字以内 |
| PostalCode | 郵便番号 | 7桁の数字（ハイフンなし） |
| Prefecture | 都道府県 | 47都道府県のいずれか |
| PhoneNumber | 電話番号 | 有効な日本の電話番号形式 |
| Platform | プラットフォーム | minne / creema |
| OrderStatus | 注文ステータス | pending / shipped |
| ShippingMethod | 配送方法 | click_post / yamato_compact |
| TrackingNumber | 追跡番号 | 配送方法ごとのフォーマット |

## ドメインサービス（Domain Services）

### OrderFetchService（注文取得サービス）

プラットフォームから注文情報を取得するドメインサービス。

```typescript
interface OrderFetchService {
  fetchFromPlatform(orderId: OrderId, platform: Platform): Promise<Order>;
}
```

### ShippingLabelIssueService（伝票発行サービス）

伝票の発行を担当するドメインサービス。

```typescript
interface ShippingLabelIssueService {
  issueClickPost(order: Order): Promise<ClickPostLabel>;
  issueYamatoCompact(order: Order): Promise<YamatoCompactLabel>;
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
  findByOrderId(orderId: OrderId): Promise<ShippingLabel | null>;
  save(label: ShippingLabel): Promise<void>;
}
```

## ドメインイベント（Domain Events）

| イベント | 発生タイミング | ハンドラー |
|---------|--------------|-----------|
| OrderCreated | 新規注文が登録されたとき | SlackNotificationHandler |
| OrderShipped | 注文が発送済みになったとき | （将来拡張用） |
| ShippingLabelIssued | 伝票が発行されたとき | （将来拡張用） |
| OrderFetchFailed | 注文情報の取得に失敗したとき | SlackErrorNotificationHandler |

## ファクトリ（Factories）

### OrderFactory

プラットフォームから取得した情報からOrderエンティティを生成する。

```typescript
interface OrderFactory {
  createFromPlatformData(data: PlatformOrderData): Order;
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

## ヘキサゴナルアーキテクチャとの対応

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Adapters (Primary)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Next.js API  │  │ Gmail Poller │  │   CLI        │              │
│  │   Routes     │  │              │  │              │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Ports (Input)                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ UseCase Interfaces (Application Layer)                        │  │
│  │ - FetchOrderFromPlatformUseCase                               │  │
│  │ - IssueClickPostLabelUseCase                                  │  │
│  │ - IssueYamatoCompactLabelUseCase                              │  │
│  │ - MarkOrderAsShippedUseCase                                   │  │
│  │ - SearchBuyersUseCase                                         │  │
│  │ - NotifyNewOrderUseCase                                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Domain Layer                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Entities, Value Objects, Domain Services, Specifications      │  │
│  │ Order, Buyer, Address, ShippingLabel, etc.                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Ports (Output)                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Repository Interfaces, External Service Interfaces           │  │
│  │ - OrderRepository                                             │  │
│  │ - ShippingLabelRepository                                     │  │
│  │ - NotificationService                                         │  │
│  │ - PlatformScraperService                                      │  │
│  │ - ClickPostService                                            │  │
│  │ - YamatoService                                               │  │
│  │ - EmailService                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Adapters (Secondary)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Spreadsheet  │  │ Playwright   │  │   Slack      │              │
│  │ Repository   │  │ Adapters     │  │  Webhook     │              │
│  │              │  │ - minne      │  │              │              │
│  │              │  │ - creema     │  │              │              │
│  │              │  │ - ClickPost  │  │              │              │
│  │              │  │ - Yamato     │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐                                                  │
│  │ Gmail        │                                                  │
│  │ Adapter      │                                                  │
│  └──────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## データフロー

```
Gmail (購入通知メール)
    │
    ▼
┌─────────────────┐
│ EmailService    │ ← メールから注文IDを抽出
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PlatformScraper │ ← Playwrightでminne/creemaから購入者情報取得
│ (minne/creema)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OrderRepository │ ← スプレッドシートに保存
│ (Spreadsheet)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ NotificationSvc │ ← Slackに通知
│ (Slack)         │
└─────────────────┘
```
