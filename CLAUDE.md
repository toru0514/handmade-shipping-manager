# GitHub Issues 計画

ハンドメイド発送管理システムの実装イシュー計画です。
設計ドキュメント（docs/）の実装フェーズに基づき、GitHub Issues を作成します。

**GitHub Projects**: https://github.com/users/toru0514/projects/2/views/1

---

## イシュー構成方針

- **フェーズ（Phase 0〜5）ごとにマイルストーン**を設定
- 各イシューは**1つのPRで完結する粒度**を目安にする
- ラベル: `phase:0` 〜 `phase:5`, `domain`, `application`, `infrastructure`, `presentation`
- イシュー間の依存関係は `blocked by #XX` で明示

---

## PR チェックリスト（全イシュー共通）

すべてのPRは、イシュー固有の受け入れ条件に**加えて**、以下を満たすこと。

### 1. テスト

- [ ] 新規・変更コードに対するユニットテストがある
- [ ] `npm run test` が全件パスする（既存テスト含む）
- [ ] テストは外部依存（API, DB, ファイルシステム）に依存せず単独実行できる（インフラ層を除く）

### 2. コード品質

- [ ] `npm run lint` がエラーなしで通る
- [ ] `npm run format` 適用済み（差分なし）
- [ ] TypeScript の `strict` モードでコンパイルエラーがない

### 3. アーキテクチャ（レイヤー依存ルール）

ヘキサゴナルアーキテクチャの依存方向を厳守する。

```
presentation → application → domain ← infrastructure
```

- [ ] **domain 層は他の層を import していない**（最重要）
- [ ] **application 層は infrastructure / presentation を import していない**
- [ ] **application 層はポート（interface）にのみ依存し、具体実装（Adapter）を import していない**
- [ ] infrastructure 層のクラスは必ずドメイン層の Port（interface）を `implements` している

### 4. ドメインモデル整合性

`docs/domain/README.md` に定義されたルールとの一致を確認する。

- [ ] 値オブジェクトは**不変（immutable）**である（プロパティが `readonly`）
- [ ] 集約ルートの操作はドメインルール（DR-XXX）に従っている
- [ ] 集約間は**IDで参照**している（直接オブジェクト参照をしない）
- [ ] OrderStatus は `pending` / `shipped` の2状態のみ（中間状態を追加しない）
- [ ] ShippingLabel の「伝票発行済み」は OrderStatus ではなく ShippingLabel の**存在**で判断する

### 5. 命名規則（ユビキタス言語）

`docs/domain/README.md` のユビキタス言語テーブルに従う。

- [ ] クラス名・変数名がユビキタス言語と一致している（例: `Order`, `Buyer`, `ShippingLabel`）
- [ ] ドメインイベント名が設計ドキュメントと一致している（例: `OrderRegistered`, `OrderShipped`）
- [ ] ファイルパスが `docs/architecture/README.md` のディレクトリ構成と一致している

### 6. 他イシューへの影響確認

- [ ] 他のイシューが依存しているインターフェース（Port）のシグネチャを変更していない（変更する場合は依存イシュー担当者と合意）
- [ ] 共有型（値オブジェクト、エンティティ）のプロパティ追加・削除をしていない（する場合は設計ドキュメントも更新）

---

## Phase 0: プロジェクトセットアップ

### Issue #1: Next.js + TypeScript プロジェクト初期化

**内容**: プロジェクトの基盤となる開発環境を構築する

- Next.js（App Router）+ TypeScript プロジェクトの作成
- tsconfig.json のパスエイリアス設定（`@/domain`, `@/application`, `@/infrastructure`, `@/presentation`）
- package.json の基本設定

**変更範囲**:
```
/ (ルート)
├── package.json
├── tsconfig.json
├── next.config.ts
└── src/
    └── app/              # Next.js App Router 初期ファイル
```

**受け入れ条件**:
- `npm run dev` でローカルサーバーが起動する
- TypeScript のパスエイリアスが動作する

---

### Issue #2: テスト環境構築（Vitest）

**内容**: ユニットテスト・統合テストの実行環境を構築する

- Vitest のインストールと設定
- テスト用のパスエイリアス設定
- カバレッジレポート設定
- サンプルテストで動作確認

**変更範囲**:
```
/ (ルート)
├── vitest.config.ts
├── package.json          # scripts, devDependencies 追加
└── src/
    └── __tests__/        # サンプルテスト
```

**受け入れ条件**:
- `npm run test` でテストが実行される
- `npm run test:coverage` でカバレッジレポートが出力される

---

### Issue #3: ESLint + Prettier 設定

**内容**: コード品質を維持するためのリンター・フォーマッター設定

- ESLint の設定（TypeScript 対応）
- Prettier の設定
- lint-staged + husky による pre-commit フック設定

**変更範囲**:
```
/ (ルート)
├── eslint.config.mjs
├── .prettierrc
├── .prettierignore
├── package.json          # scripts, devDependencies 追加
└── .husky/
    └── pre-commit
```

**受け入れ条件**:
- `npm run lint` でリントが実行される
- `npm run format` でフォーマットが実行される
- コミット時に自動でリント・フォーマットが実行される

---

### Issue #4: ヘキサゴナルアーキテクチャのディレクトリ構成作成

**内容**: `docs/architecture/README.md` で定義したディレクトリ構成を作成する

- `src/domain/`, `src/application/`, `src/infrastructure/`, `src/presentation/` の作成
- 各レイヤーのサブディレクトリ作成（entities, valueObjects, ports, services, specifications, factories 等）
- 各ディレクトリに `.gitkeep` を配置

**変更範囲**:
```
src/
├── domain/
│   ├── entities/
│   ├── valueObjects/
│   ├── ports/
│   ├── services/
│   ├── specifications/
│   └── factories/
├── application/
│   └── usecases/
├── infrastructure/
│   ├── adapters/
│   │   ├── shipping/
│   │   ├── platform/
│   │   ├── notification/
│   │   └── persistence/
│   ├── di/
│   └── external/
└── presentation/
    ├── components/
    └── pages/
```

**受け入れ条件**:
- `docs/architecture/README.md` のディレクトリ構成と一致している
- レイヤー間の依存方向がESLintルール等で確認できる（可能であれば）

---

## Phase 1: ドメイン層（コア）

### Issue #5: 値オブジェクト実装 — 基本型（OrderId, Platform, OrderStatus, ShippingMethod）

**内容**: ドメインの基本的な識別子・列挙型の値オブジェクトを実装する

- `OrderId` — プラットフォーム固有のフォーマット
- `Platform` — minne / creema（DR-PLT-001）
- `OrderStatus` — pending / shipped（DR-ORD-003）
- `ShippingMethod` — click_post / yamato_compact（DR-SHP-001）
- `LabelId` — 伝票ID
- `MessageTemplateType` — purchase_thanks / shipping_notice

**変更範囲**:
```
src/domain/valueObjects/
├── OrderId.ts
├── LabelId.ts
├── Platform.ts
├── OrderStatus.ts
├── ShippingMethod.ts
└── MessageTemplateType.ts

src/domain/valueObjects/__tests__/
├── OrderId.test.ts
├── LabelId.test.ts
├── Platform.test.ts
├── OrderStatus.test.ts
├── ShippingMethod.test.ts
└── MessageTemplateType.test.ts
```

**受け入れ条件**:
- 各値オブジェクトの不変性が保証されている
- 不正な値に対してエラーが投げられる
- 全ての値オブジェクトにユニットテストがある

---

### Issue #6: 値オブジェクト実装 — 住所・購入者関連（Address, Buyer, PostalCode, Prefecture, BuyerName, PhoneNumber）

**内容**: 住所と購入者に関する値オブジェクトを実装する

- `PostalCode` — 7桁の数字（DR-ADR-001）
- `Prefecture` — 47都道府県（DR-ADR-002）
- `Address` — 郵便番号、都道府県、市区町村、番地、建物名（DR-ADR-003）
- `BuyerName` — 空文字不可、100文字以内
- `PhoneNumber` — 有効な日本の電話番号形式（optional）
- `Buyer` — 名前、住所、電話番号を含む複合値オブジェクト

**変更範囲**:
```
src/domain/valueObjects/
├── PostalCode.ts
├── Prefecture.ts
├── Address.ts
├── BuyerName.ts
├── PhoneNumber.ts
└── Buyer.ts

src/domain/valueObjects/__tests__/
├── PostalCode.test.ts
├── Prefecture.test.ts
├── Address.test.ts
├── BuyerName.test.ts
├── PhoneNumber.test.ts
└── Buyer.test.ts
```

**受け入れ条件**:
- バリデーションルール（ドメインルール DR-ADR-001〜003）が実装されている
- PhoneNumber は optional として扱える
- 全ての値オブジェクトにユニットテストがある

---

### Issue #7: 値オブジェクト実装 — 商品・追跡・メッセージ（Product, TrackingNumber, Message）

**内容**: 残りの値オブジェクトを実装する

- `Product` — 商品名、価格
- `TrackingNumber` — 配送方法ごとのフォーマット
- `Message` — 生成済みメッセージ（空文字不可）

**変更範囲**:
```
src/domain/valueObjects/
├── Product.ts
├── TrackingNumber.ts
└── Message.ts

src/domain/valueObjects/__tests__/
├── Product.test.ts
├── TrackingNumber.test.ts
└── Message.test.ts
```

**受け入れ条件**:
- 全ての値オブジェクトにユニットテストがある

---

### Issue #8: Order エンティティ（集約ルート）実装

**内容**: Order 集約ルートを実装する

- Order エンティティの実装（orderId, platform, buyer, product, status, orderedAt, shippedAt, shippingMethod, trackingNumber）
- `markAsShipped(method, trackingNumber?)` — DR-ORD-003, DR-ORD-004, DR-ORD-005
- `isOverdue(): boolean` — DR-ORD-006
- `getDaysSinceOrder(): number`
- ドメインイベントの発行（OrderRegistered, OrderShipped）

**変更範囲**:
```
src/domain/entities/
├── Order.ts
└── __tests__/
    └── Order.test.ts
```

**依存**: #5, #6, #7
**受け入れ条件**:
- pending → shipped の一方向遷移のみ許可される
- 発送済みの注文に対する変更はエラーになる
- 発送完了時に日時が記録される
- 全メソッドにユニットテストがある

---

### Issue #9: ShippingLabel エンティティ（集約ルート）実装

**内容**: ShippingLabel 集約ルートと派生型を実装する

- ShippingLabel エンティティの実装（labelId, orderId, type, status, issuedAt, expiresAt）
- `isExpired(): boolean`
- ClickPostLabel（pdfData, trackingNumber）
- YamatoCompactLabel（qrCode, waybillNumber）— DR-LBL-001: 14日間有効

**変更範囲**:
```
src/domain/entities/
├── ShippingLabel.ts
├── ClickPostLabel.ts
├── YamatoCompactLabel.ts
└── __tests__/
    ├── ShippingLabel.test.ts
    ├── ClickPostLabel.test.ts
    └── YamatoCompactLabel.test.ts
```

**依存**: #5
**受け入れ条件**:
- ShippingLabel が Order と ID参照で紐づく
- YamatoCompactLabel の有効期限チェックが正しく動作する
- 全メソッドにユニットテストがある

---

### Issue #10: ポート（インターフェース）定義

**内容**: ドメイン層のポート（インターフェース）を定義する

- `OrderRepository` — findById, findByStatus, findByBuyerName, save, exists, findAll
- `ShippingLabelRepository` — findById, findByOrderId（配列返却: 1:N対応）, save
- `MessageTemplateRepository` — findByType, save, resetToDefault
- `ShippingLabelIssuer` — issue(order, method)
- `OrderFetcher` — fetch(orderId, platform) → PlatformOrderData
- `NotificationSender` — notify(message)

**変更範囲**:
```
src/domain/ports/
├── OrderRepository.ts
├── ShippingLabelRepository.ts
├── MessageTemplateRepository.ts
├── ShippingLabelIssuer.ts
├── OrderFetcher.ts
└── NotificationSender.ts
```

**受け入れ条件**:
- 全てのポートが TypeScript interface として定義されている
- ドメイン層内に外部依存がない

---

### Issue #11: ドメインサービス・仕様・ファクトリ実装

**内容**: ドメインサービス、仕様パターン、ファクトリを実装する

- `MessageGenerator` — generate(order, template): Message
- `MessageTemplate` インターフェース（設定/読み取りモデル）
- `OverdueOrderSpecification` — 3日以上経過 + pending（DR-ORD-006）
- `OrderFactory` — createFromPlatformData(data): Order

**変更範囲**:
```
src/domain/
├── services/
│   ├── MessageGenerator.ts
│   └── __tests__/
│       └── MessageGenerator.test.ts
├── specifications/
│   ├── OverdueOrderSpecification.ts
│   └── __tests__/
│       └── OverdueOrderSpecification.test.ts
└── factories/
    ├── OrderFactory.ts
    └── __tests__/
        └── OrderFactory.test.ts
```

**依存**: #8, #9, #10
**受け入れ条件**:
- MessageGenerator がテンプレート変数を正しく置換する
- OverdueOrderSpecification が正しく判定する
- OrderFactory が PlatformOrderData から Order を生成できる
- 全てにユニットテストがある

---

## Phase 2: 注文管理（基本フロー）

### Issue #12: インフラ層 — SpreadsheetOrderRepository 実装

**内容**: Google Sheets API を使った OrderRepository の実装

- SpreadsheetOrderRepository（implements OrderRepository）
- Google Sheets API との接続設定
- CRUD操作の実装

**変更範囲**:
```
src/infrastructure/
├── adapters/persistence/
│   ├── SpreadsheetOrderRepository.ts
│   └── __tests__/
│       └── SpreadsheetOrderRepository.test.ts
└── external/google/
    └── SheetsClient.ts
```

**依存**: #10
**受け入れ条件**:
- OrderRepository の全メソッドが実装されている
- 統合テストがある（モック or テスト用シート）

---

### Issue #13: UC-003 発送前注文一覧を表示する

**内容**: 未発送の注文を一覧表示するユースケースとUIを実装する

- `ListPendingOrdersUseCase` — OrderRepository.findByStatus(pending) を使用
- 注文一覧画面のUI実装（発送前注文カード: 注文番号、購入者名、商品名、注文日、経過日数）
- 超過注文（3日以上）の警告表示（OverdueOrderSpecification）
- [購入お礼] ボタンの配置（Phase 3 で接続）

**変更範囲**:
```
src/application/usecases/
├── ListPendingOrdersUseCase.ts
└── __tests__/
    └── ListPendingOrdersUseCase.test.ts

src/presentation/
├── components/
│   └── orders/
│       ├── PendingOrderList.tsx
│       └── PendingOrderCard.tsx
└── pages/
    └── orders/
```

**依存**: #11, #12
**受け入れ条件**:
- pending ステータスの注文のみ表示される
- 3日以上経過した注文に警告が表示される
- UC-003 のワイヤーフレームに沿ったUIである

---

### Issue #14: UC-006 発送完了を記録する

**内容**: 注文のステータスを発送済みに更新するユースケースとUIを実装する

- `MarkOrderAsShippedUseCase` — Order.markAsShipped() を使用
- 発送完了確認ダイアログUI
- 追跡番号の入力（任意）
- 発送後の一覧更新

**変更範囲**:
```
src/application/usecases/
├── MarkOrderAsShippedUseCase.ts
└── __tests__/
    └── MarkOrderAsShippedUseCase.test.ts

src/presentation/components/orders/
├── ShipmentConfirmDialog.tsx
└── ShipmentCompleteMessage.tsx
```

**依存**: #13
**受け入れ条件**:
- 発送完了ボタン → 確認ダイアログ → ステータス更新の流れが動作する
- 追跡番号の入力・記録が動作する
- 発送済み注文が一覧から消える
- UC-006 のドメインルール（DR-ORD-003〜005）が適用される

---

### Issue #15: UC-007 購入者情報を検索・参照する

**内容**: 過去の購入者情報を検索・閲覧するユースケースとUIを実装する

- `SearchBuyersUseCase` — OrderRepository.findByBuyerName() を使用
- 購入者検索UI（名前検索）
- 購入者詳細表示（住所、過去の注文履歴）

**変更範囲**:
```
src/application/usecases/
├── SearchBuyersUseCase.ts
└── __tests__/
    └── SearchBuyersUseCase.test.ts

src/presentation/
├── components/buyers/
│   ├── BuyerSearchForm.tsx
│   └── BuyerDetail.tsx
└── pages/buyers/
```

**依存**: #12
**受け入れ条件**:
- 購入者名での検索が動作する
- 購入者の詳細情報が表示される
- UC-007 の仕様に沿ったUIである

---

## Phase 3: メッセージ機能

### Issue #16: インフラ層 — LocalStorageMessageTemplateRepository 実装

**内容**: ブラウザの LocalStorage を使った MessageTemplateRepository の実装

- LocalStorageMessageTemplateRepository（implements MessageTemplateRepository）
- デフォルトテンプレートの初期値設定
- resetToDefault の実装

**変更範囲**:
```
src/infrastructure/adapters/persistence/
├── LocalStorageMessageTemplateRepository.ts
└── __tests__/
    └── LocalStorageMessageTemplateRepository.test.ts
```

**依存**: #10
**受け入れ条件**:
- MessageTemplateRepository の全メソッドが実装されている
- デフォルトテンプレートが正しく読み込まれる
- テストがある

---

### Issue #17: UC-010 定型文を設定する

**内容**: メッセージテンプレートの編集UIを実装する

- `UpdateMessageTemplateUseCase`
- テンプレート編集画面UI（購入お礼 / 発送連絡）
- 利用可能な変数の一覧表示
- プレビュー機能
- デフォルトに戻す機能

**変更範囲**:
```
src/application/usecases/
├── UpdateMessageTemplateUseCase.ts
└── __tests__/
    └── UpdateMessageTemplateUseCase.test.ts

src/presentation/
├── components/settings/
│   ├── TemplateEditor.tsx
│   ├── TemplatePreview.tsx
│   └── VariableList.tsx
└── pages/settings/
```

**依存**: #16
**受け入れ条件**:
- テンプレートの編集・保存が動作する
- 変数一覧が表示される
- プレビューが動作する
- デフォルトに戻す機能が動作する
- DR-MSG-001（空テンプレート禁止）、DR-MSG-002（変数必須）が適用される

---

### Issue #18: UC-008 購入お礼メッセージを作成する

**内容**: 購入お礼メッセージを生成しクリップボードにコピーする機能を実装する

- `GeneratePurchaseThanksUseCase` — MessageGenerator.generate() を使用
- 注文一覧の [購入お礼] ボタンと接続
- メッセージプレビュー → クリップボードコピー

**変更範囲**:
```
src/application/usecases/
├── GeneratePurchaseThanksUseCase.ts
└── __tests__/
    └── GeneratePurchaseThanksUseCase.test.ts

src/presentation/components/messages/
├── MessagePreviewDialog.tsx
└── CopyToClipboardButton.tsx

src/presentation/components/orders/
└── PendingOrderCard.tsx        # [購入お礼] ボタン接続（既存変更）
```

**依存**: #13, #17
**受け入れ条件**:
- [購入お礼] ボタン → メッセージ生成 → コピーの流れが動作する
- テンプレート変数（購入者名、商品名等）が正しく置換される
- コピー完了の通知が表示される

---

### Issue #19: UC-009 発送連絡メッセージを作成する

**内容**: 発送連絡メッセージを生成しクリップボードにコピーする機能を実装する

- `GenerateShippingNoticeUseCase` — MessageGenerator.generate() を使用
- 発送完了後のフローに組み込み
- メッセージプレビュー → クリップボードコピー

**変更範囲**:
```
src/application/usecases/
├── GenerateShippingNoticeUseCase.ts
└── __tests__/
    └── GenerateShippingNoticeUseCase.test.ts

src/presentation/components/orders/
└── ShipmentCompleteMessage.tsx  # 発送連絡ボタン追加（既存変更）
```

**依存**: #14, #17
**受け入れ条件**:
- 発送完了後 → メッセージ生成 → コピーの流れが動作する
- テンプレート変数（購入者名、商品名、追跡番号等）が正しく置換される
- コピー完了の通知が表示される

---

## Phase 4: 伝票発行（外部連携あり）

### Issue #20: インフラ層 — ShippingLabelIssuerImpl + ShippingLabelRepository 実装

**内容**: 伝票発行の基盤となるインフラ層を実装する

- `ShippingLabelIssuerImpl`（implements ShippingLabelIssuer）— ClickPostGateway / YamatoCompactGateway の振り分け
- `SpreadsheetShippingLabelRepository`（implements ShippingLabelRepository）

**変更範囲**:
```
src/infrastructure/adapters/
├── shipping/
│   ├── ShippingLabelIssuerImpl.ts
│   └── __tests__/
│       └── ShippingLabelIssuerImpl.test.ts
└── persistence/
    ├── SpreadsheetShippingLabelRepository.ts
    └── __tests__/
        └── SpreadsheetShippingLabelRepository.test.ts
```

**依存**: #10
**受け入れ条件**:
- ShippingMethod に応じて正しい Gateway に振り分けられる
- ShippingLabelRepository の全メソッドが実装されている

---

### Issue #21: UC-004 クリックポスト伝票を発行する

**内容**: Playwright でクリックポストのPDF伝票を発行する

- `ClickPostAdapter`（implements ClickPostGateway）
- Playwright でクリックポストサイトにアクセスし、伝票PDFを取得
- `IssueShippingLabelUseCase` のクリックポスト経路
- 伝票発行UIと結果表示

**変更範囲**:
```
src/application/usecases/
├── IssueShippingLabelUseCase.ts       # #22 と共有（先に作成した方が実装）
└── __tests__/
    └── IssueShippingLabelUseCase.test.ts

src/infrastructure/adapters/shipping/
├── ClickPostAdapter.ts
└── __tests__/
    └── ClickPostAdapter.test.ts

src/infrastructure/external/playwright/
└── ClickPostPage.ts

src/presentation/components/labels/
├── IssueLabelButton.tsx
└── LabelResultView.tsx
```

**依存**: #13, #20
**受け入れ条件**:
- 注文一覧から伝票発行ボタン → クリックポスト伝票PDF取得の流れが動作する
- DR-LBL-002（発送前のみ発行可）、DR-LBL-003（重複発行警告）が適用される
- エラー時のハンドリングが適切

---

### Issue #22: UC-005 宅急便コンパクト伝票を発行する

**内容**: Playwright でヤマト運輸のQRコードを発行する

- `YamatoCompactAdapter`（implements YamatoCompactGateway）
- Playwright でヤマト運輸PUDOサイトにアクセスし、QRコードを取得
- `IssueShippingLabelUseCase` の宅急便コンパクト経路
- DR-LBL-001: 14日間有効期限の表示

**変更範囲**:
```
src/infrastructure/adapters/shipping/
├── YamatoCompactAdapter.ts
└── __tests__/
    └── YamatoCompactAdapter.test.ts

src/infrastructure/external/playwright/
└── YamatoPudoPage.ts

src/presentation/components/labels/
└── LabelResultView.tsx          # QRコード・有効期限表示の追加（既存変更）
```

**依存**: #13, #20
**受け入れ条件**:
- 注文一覧から伝票発行ボタン → QRコード取得の流れが動作する
- 有効期限が表示される
- DR-LBL-002, DR-LBL-003 が適用される

---

## Phase 5: 自動化パイプライン（外部連携あり）

### Issue #23: インフラ層 — GmailAdapter + PlatformAdapter 実装

**内容**: メール監視とプラットフォームスクレイピングの基盤を実装する

- Gmail API による購入通知メール監視
- メール本文から注文IDの抽出
- `MinneAdapter`（implements OrderFetcher）— Playwright で minne から購入者情報取得
- `CreemaAdapter`（implements OrderFetcher）— Playwright で creema から購入者情報取得
- `OrderFactory.createFromPlatformData()` との接続

**変更範囲**:
```
src/infrastructure/
├── adapters/platform/
│   ├── MinneAdapter.ts
│   ├── CreemaAdapter.ts
│   └── __tests__/
│       ├── MinneAdapter.test.ts
│       └── CreemaAdapter.test.ts
└── external/
    ├── google/
    │   └── GmailClient.ts
    └── playwright/
        ├── MinnePage.ts
        └── CreemaPage.ts
```

**依存**: #11, #12
**受け入れ条件**:
- Gmail から購入通知メールを検出できる
- minne/creema から購入者情報を取得できる
- PlatformOrderData → Order への変換が正しく動作する

---

### Issue #24: UC-001 購入情報を自動取得する

**内容**: メール検知から注文登録までの自動パイプラインを実装する

- `FetchOrderUseCase` の実装
- Gmail Poller（定期実行 or Webhook）
- 注文取得 → 重複チェック（DR-ORD-001）→ 登録の流れ
- 失敗時のエラーハンドリング（注文は登録しない）

**変更範囲**:
```
src/application/usecases/
├── FetchOrderUseCase.ts
└── __tests__/
    └── FetchOrderUseCase.test.ts

src/infrastructure/adapters/platform/
└── GmailPoller.ts
```

**依存**: #23
**受け入れ条件**:
- メール受信 → 注文情報取得 → スプレッドシート保存の流れが動作する
- 重複注文がスキップされる
- 取得失敗時にエラー通知が送信される

---

### Issue #25: インフラ層 — SlackAdapter 実装

**内容**: Slack Webhook による通知機能を実装する

- `SlackAdapter`（implements NotificationSender）
- Slack Webhook の設定
- 通知メッセージのフォーマット（新規注文通知、エラー通知）

**変更範囲**:
```
src/infrastructure/adapters/notification/
├── SlackAdapter.ts
└── __tests__/
    └── SlackAdapter.test.ts
```

**依存**: #10
**受け入れ条件**:
- Slack に通知メッセージが送信される
- エラー通知が送信される

---

### Issue #26: UC-002 新規注文を通知する

**内容**: 新規注文登録後の Slack 通知を実装する

- `NotifyNewOrderUseCase` の実装
- OrderRegistered イベント → Slack 通知
- OrderFetchFailed イベント → エラー通知

**変更範囲**:
```
src/application/usecases/
├── NotifyNewOrderUseCase.ts
└── __tests__/
    └── NotifyNewOrderUseCase.test.ts
```

**依存**: #24, #25
**受け入れ条件**:
- 新規注文登録後に Slack 通知が送信される
- 注文取得失敗時にエラー通知が送信される

---

## イシュー一覧サマリー

| # | Phase | イシュータイトル | 主な変更範囲 | 依存 |
|---|-------|----------------|-------------|------|
| 1 | 0 | Next.js + TypeScript プロジェクト初期化 | `/` (ルート設定) | — |
| 2 | 0 | テスト環境構築（Vitest） | `/` (ルート設定) | — |
| 3 | 0 | ESLint + Prettier 設定 | `/` (ルート設定) | — |
| 4 | 0 | ヘキサゴナルアーキテクチャのディレクトリ構成作成 | `src/` (全レイヤー) | — |
| 5 | 1 | 値オブジェクト実装 — 基本型 | `src/domain/valueObjects/` | — |
| 6 | 1 | 値オブジェクト実装 — 住所・購入者関連 | `src/domain/valueObjects/` | — |
| 7 | 1 | 値オブジェクト実装 — 商品・追跡・メッセージ | `src/domain/valueObjects/` | — |
| 8 | 1 | Order エンティティ実装 | `src/domain/entities/` | #5,#6,#7 |
| 9 | 1 | ShippingLabel エンティティ実装 | `src/domain/entities/` | #5 |
| 10 | 1 | ポート定義 | `src/domain/ports/` | — |
| 11 | 1 | ドメインサービス・仕様・ファクトリ | `src/domain/services/`, `specifications/`, `factories/` | #8,#9,#10 |
| 12 | 2 | SpreadsheetOrderRepository | `src/infrastructure/adapters/persistence/`, `external/google/` | #10 |
| 13 | 2 | UC-003 発送前注文一覧 | `src/application/usecases/`, `src/presentation/` (orders) | #11,#12 |
| 14 | 2 | UC-006 発送完了記録 | `src/application/usecases/`, `src/presentation/` (orders) | #13 |
| 15 | 2 | UC-007 購入者検索 | `src/application/usecases/`, `src/presentation/` (buyers) | #12 |
| 16 | 3 | LocalStorageMessageTemplateRepository | `src/infrastructure/adapters/persistence/` | #10 |
| 17 | 3 | UC-010 定型文設定 | `src/application/usecases/`, `src/presentation/` (settings) | #16 |
| 18 | 3 | UC-008 購入お礼メッセージ | `src/application/usecases/`, `src/presentation/` (messages, orders) | #13,#17 |
| 19 | 3 | UC-009 発送連絡メッセージ | `src/application/usecases/`, `src/presentation/` (orders) | #14,#17 |
| 20 | 4 | ShippingLabelIssuerImpl + Repository | `src/infrastructure/adapters/shipping/`, `persistence/` | #10 |
| 21 | 4 | UC-004 クリックポスト伝票 | `src/application/usecases/`, `infrastructure/shipping/`, `presentation/` (labels) | #13,#20 |
| 22 | 4 | UC-005 宅急便コンパクト伝票 | `src/infrastructure/adapters/shipping/`, `external/playwright/` | #13,#20 |
| 23 | 5 | GmailAdapter + PlatformAdapter | `src/infrastructure/adapters/platform/`, `external/` | #11,#12 |
| 24 | 5 | UC-001 購入情報自動取得 | `src/application/usecases/`, `infrastructure/adapters/platform/` | #23 |
| 25 | 5 | SlackAdapter | `src/infrastructure/adapters/notification/` | #10 |
| 26 | 5 | UC-002 新規注文通知 | `src/application/usecases/` | #24,#25 |
