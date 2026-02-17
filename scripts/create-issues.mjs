#!/usr/bin/env node
/**
 * GitHub Issues 一括作成スクリプト
 * CLAUDE.md で定義された全26イシューを GitHub に作成します。
 *
 * 使い方:
 *   node scripts/create-issues.mjs
 *
 * 環境変数:
 *   GITHUB_TOKEN (未認証の場合は rate limit に注意)
 *
 * 前提:
 *   - HTTPS_PROXY が設定されていること（Claude Code 環境）
 *   - または直接 api.github.com にアクセスできること
 */

import http from "http";
import https from "https";
import tls from "tls";

const OWNER = "toru0514";
const REPO = "handmade-shipping-manager";
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;
const PROXY_URL = process.env.HTTPS_PROXY || process.env.https_proxy;

// ---- HTTP Helper ----

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const fullUrl = `https://api.github.com${path}`;
    const headers = {
      "User-Agent": "handmade-shipping-manager-issue-creator",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) {
      headers["Content-Length"] = Buffer.byteLength(bodyStr);
    }

    if (PROXY_URL) {
      // Use CONNECT tunnel through proxy
      const proxyUrl = new URL(PROXY_URL);
      const proxyAuth =
        proxyUrl.username && proxyUrl.password
          ? "Basic " +
            Buffer.from(
              `${proxyUrl.username}:${proxyUrl.password}`
            ).toString("base64")
          : null;

      const connectOptions = {
        hostname: proxyUrl.hostname,
        port: proxyUrl.port,
        method: "CONNECT",
        path: "api.github.com:443",
        headers: {},
      };
      if (proxyAuth) {
        connectOptions.headers["Proxy-Authorization"] = proxyAuth;
      }

      const proxyReq = http.request(connectOptions);
      proxyReq.on("connect", (res, socket) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
          return;
        }
        const tlsSocket = tls.connect(
          { socket, servername: "api.github.com" },
          () => {
            const reqLine = `${method} ${path} HTTP/1.1\r\n`;
            const headerLines = Object.entries({
              ...headers,
              Host: "api.github.com",
              Connection: "close",
            })
              .map(([k, v]) => `${k}: ${v}`)
              .join("\r\n");
            tlsSocket.write(reqLine + headerLines + "\r\n\r\n");
            if (bodyStr) tlsSocket.write(bodyStr);

            let data = "";
            tlsSocket.on("data", (chunk) => (data += chunk));
            tlsSocket.on("end", () => {
              const parts = data.split("\r\n\r\n");
              const statusLine = parts[0].split("\r\n")[0];
              const statusCode = parseInt(statusLine.split(" ")[1]);
              // Handle chunked transfer encoding
              let responseBody = parts.slice(1).join("\r\n\r\n");
              // Simple chunked decode
              if (
                parts[0].toLowerCase().includes("transfer-encoding: chunked")
              ) {
                responseBody = decodeChunked(responseBody);
              }
              try {
                resolve({ statusCode, body: JSON.parse(responseBody) });
              } catch {
                resolve({ statusCode, body: responseBody });
              }
            });
          }
        );
        tlsSocket.on("error", reject);
      });
      proxyReq.on("error", reject);
      proxyReq.end();
    } else {
      // Direct HTTPS
      const urlObj = new URL(fullUrl);
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname,
        method,
        headers: { ...headers, Host: urlObj.hostname, Connection: "close" },
      };
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ statusCode: res.statusCode, body: data });
          }
        });
      });
      req.on("error", reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    }
  });
}

function decodeChunked(data) {
  let result = "";
  let remaining = data;
  while (remaining.length > 0) {
    const lineEnd = remaining.indexOf("\r\n");
    if (lineEnd === -1) break;
    const size = parseInt(remaining.substring(0, lineEnd), 16);
    if (size === 0) break;
    result += remaining.substring(lineEnd + 2, lineEnd + 2 + size);
    remaining = remaining.substring(lineEnd + 2 + size + 2);
  }
  return result;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiCall(method, path, body = null, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await makeRequest(method, path, body);
      if (result.statusCode === 403 && result.body?.message?.includes("rate limit")) {
        console.log("  ⏳ Rate limited, waiting 60s...");
        await sleep(60000);
        continue;
      }
      return result;
    } catch (e) {
      if (i < retries - 1) {
        console.log(`  Retry ${i + 1}/${retries}: ${e.message}`);
        await sleep(2000 * (i + 1));
      } else throw e;
    }
  }
}

// ---- Data ----

const milestones = [
  {
    title: "Phase 0: プロジェクトセットアップ",
    description: "開発環境構築・ディレクトリ構成",
  },
  { title: "Phase 1: ドメイン層（コア）", description: "値オブジェクト・エンティティ・ポート・ドメインサービス" },
  {
    title: "Phase 2: 注文管理（基本フロー）",
    description: "リポジトリ実装・注文一覧・発送完了・購入者検索",
  },
  { title: "Phase 3: メッセージ機能", description: "テンプレート管理・購入お礼・発送連絡メッセージ" },
  {
    title: "Phase 4: 伝票発行（外部連携あり）",
    description: "クリックポスト・宅急便コンパクト伝票発行",
  },
  {
    title: "Phase 5: 自動化パイプライン（外部連携あり）",
    description: "Gmail監視・プラットフォーム連携・Slack通知",
  },
];

const labels = [
  { name: "phase:0", color: "d4c5f9", description: "Phase 0: プロジェクトセットアップ" },
  { name: "phase:1", color: "c5def5", description: "Phase 1: ドメイン層" },
  { name: "phase:2", color: "bfdadc", description: "Phase 2: 注文管理" },
  { name: "phase:3", color: "bfd4f2", description: "Phase 3: メッセージ機能" },
  { name: "phase:4", color: "d4e4bc", description: "Phase 4: 伝票発行" },
  { name: "phase:5", color: "fef2c0", description: "Phase 5: 自動化パイプライン" },
  { name: "domain", color: "e11d48", description: "ドメイン層の変更" },
  { name: "application", color: "f97316", description: "アプリケーション層の変更" },
  { name: "infrastructure", color: "0ea5e9", description: "インフラストラクチャ層の変更" },
  { name: "presentation", color: "8b5cf6", description: "プレゼンテーション層の変更" },
];

const issues = [
  // Phase 0
  {
    title: "Next.js + TypeScript プロジェクト初期化",
    labels: ["phase:0"],
    milestone: 0,
    body: `## 内容

プロジェクトの基盤となる開発環境を構築する

- Next.js（App Router）+ TypeScript プロジェクトの作成
- tsconfig.json のパスエイリアス設定（\`@/domain\`, \`@/application\`, \`@/infrastructure\`, \`@/presentation\`）
- package.json の基本設定

## 変更範囲

\`\`\`
/ (ルート)
├── package.json
├── tsconfig.json
├── next.config.ts
└── src/
    └── app/              # Next.js App Router 初期ファイル
\`\`\`

## 受け入れ条件

- [ ] \`npm run dev\` でローカルサーバーが起動する
- [ ] TypeScript のパスエイリアスが動作する`,
  },
  {
    title: "テスト環境構築（Vitest）",
    labels: ["phase:0"],
    milestone: 0,
    body: `## 内容

ユニットテスト・統合テストの実行環境を構築する

- Vitest のインストールと設定
- テスト用のパスエイリアス設定
- カバレッジレポート設定
- サンプルテストで動作確認

## 変更範囲

\`\`\`
/ (ルート)
├── vitest.config.ts
├── package.json          # scripts, devDependencies 追加
└── src/
    └── __tests__/        # サンプルテスト
\`\`\`

## 受け入れ条件

- [ ] \`npm run test\` でテストが実行される
- [ ] \`npm run test:coverage\` でカバレッジレポートが出力される`,
  },
  {
    title: "ESLint + Prettier 設定",
    labels: ["phase:0"],
    milestone: 0,
    body: `## 内容

コード品質を維持するためのリンター・フォーマッター設定

- ESLint の設定（TypeScript 対応）
- Prettier の設定
- lint-staged + husky による pre-commit フック設定

## 変更範囲

\`\`\`
/ (ルート)
├── eslint.config.mjs
├── .prettierrc
├── .prettierignore
├── package.json          # scripts, devDependencies 追加
└── .husky/
    └── pre-commit
\`\`\`

## 受け入れ条件

- [ ] \`npm run lint\` でリントが実行される
- [ ] \`npm run format\` でフォーマットが実行される
- [ ] コミット時に自動でリント・フォーマットが実行される`,
  },
  {
    title: "ヘキサゴナルアーキテクチャのディレクトリ構成作成",
    labels: ["phase:0"],
    milestone: 0,
    body: `## 内容

\`docs/architecture/README.md\` で定義したディレクトリ構成を作成する

- \`src/domain/\`, \`src/application/\`, \`src/infrastructure/\`, \`src/presentation/\` の作成
- 各レイヤーのサブディレクトリ作成（entities, valueObjects, ports, services, specifications, factories 等）
- 各ディレクトリに \`.gitkeep\` を配置

## 変更範囲

\`\`\`
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
\`\`\`

## 受け入れ条件

- [ ] \`docs/architecture/README.md\` のディレクトリ構成と一致している
- [ ] レイヤー間の依存方向がESLintルール等で確認できる（可能であれば）`,
  },
  // Phase 1
  {
    title: "値オブジェクト実装 — 基本型（OrderId, Platform, OrderStatus, ShippingMethod）",
    labels: ["phase:1", "domain"],
    milestone: 1,
    body: `## 内容

ドメインの基本的な識別子・列挙型の値オブジェクトを実装する

- \`OrderId\` — プラットフォーム固有のフォーマット
- \`Platform\` — minne / creema（DR-PLT-001）
- \`OrderStatus\` — pending / shipped（DR-ORD-003）
- \`ShippingMethod\` — click_post / yamato_compact（DR-SHP-001）
- \`LabelId\` — 伝票ID
- \`MessageTemplateType\` — purchase_thanks / shipping_notice

## 変更範囲

\`\`\`
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
\`\`\`

## 受け入れ条件

- [ ] 各値オブジェクトの不変性が保証されている
- [ ] 不正な値に対してエラーが投げられる
- [ ] 全ての値オブジェクトにユニットテストがある`,
  },
  {
    title: "値オブジェクト実装 — 住所・購入者関連（Address, Buyer, PostalCode, Prefecture, BuyerName, PhoneNumber）",
    labels: ["phase:1", "domain"],
    milestone: 1,
    body: `## 内容

住所と購入者に関する値オブジェクトを実装する

- \`PostalCode\` — 7桁の数字（DR-ADR-001）
- \`Prefecture\` — 47都道府県（DR-ADR-002）
- \`Address\` — 郵便番号、都道府県、市区町村、番地、建物名（DR-ADR-003）
- \`BuyerName\` — 空文字不可、100文字以内
- \`PhoneNumber\` — 有効な日本の電話番号形式（optional）
- \`Buyer\` — 名前、住所、電話番号を含む複合値オブジェクト

## 変更範囲

\`\`\`
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
\`\`\`

## 受け入れ条件

- [ ] バリデーションルール（ドメインルール DR-ADR-001〜003）が実装されている
- [ ] PhoneNumber は optional として扱える
- [ ] 全ての値オブジェクトにユニットテストがある`,
  },
  {
    title: "値オブジェクト実装 — 商品・追跡・メッセージ（Product, TrackingNumber, Message）",
    labels: ["phase:1", "domain"],
    milestone: 1,
    body: `## 内容

残りの値オブジェクトを実装する

- \`Product\` — 商品名、価格
- \`TrackingNumber\` — 配送方法ごとのフォーマット
- \`Message\` — 生成済みメッセージ（空文字不可）

## 変更範囲

\`\`\`
src/domain/valueObjects/
├── Product.ts
├── TrackingNumber.ts
└── Message.ts

src/domain/valueObjects/__tests__/
├── Product.test.ts
├── TrackingNumber.test.ts
└── Message.test.ts
\`\`\`

## 受け入れ条件

- [ ] 全ての値オブジェクトにユニットテストがある`,
  },
  {
    title: "Order エンティティ（集約ルート）実装",
    labels: ["phase:1", "domain"],
    milestone: 1,
    body: `## 内容

Order 集約ルートを実装する

- Order エンティティの実装（orderId, platform, buyer, product, status, orderedAt, shippedAt, shippingMethod, trackingNumber）
- \`markAsShipped(method, trackingNumber?)\` — DR-ORD-003, DR-ORD-004, DR-ORD-005
- \`isOverdue(): boolean\` — DR-ORD-006
- \`getDaysSinceOrder(): number\`
- ドメインイベントの発行（OrderRegistered, OrderShipped）

## 変更範囲

\`\`\`
src/domain/entities/
├── Order.ts
└── __tests__/
    └── Order.test.ts
\`\`\`

## 依存

blocked by #5, #6, #7

## 受け入れ条件

- [ ] pending → shipped の一方向遷移のみ許可される
- [ ] 発送済みの注文に対する変更はエラーになる
- [ ] 発送完了時に日時が記録される
- [ ] 全メソッドにユニットテストがある`,
  },
  {
    title: "ShippingLabel エンティティ（集約ルート）実装",
    labels: ["phase:1", "domain"],
    milestone: 1,
    body: `## 内容

ShippingLabel 集約ルートと派生型を実装する

- ShippingLabel エンティティの実装（labelId, orderId, type, status, issuedAt, expiresAt）
- \`isExpired(): boolean\`
- ClickPostLabel（pdfData, trackingNumber）
- YamatoCompactLabel（qrCode, waybillNumber）— DR-LBL-001: 14日間有効

## 変更範囲

\`\`\`
src/domain/entities/
├── ShippingLabel.ts
├── ClickPostLabel.ts
├── YamatoCompactLabel.ts
└── __tests__/
    ├── ShippingLabel.test.ts
    ├── ClickPostLabel.test.ts
    └── YamatoCompactLabel.test.ts
\`\`\`

## 依存

blocked by #5

## 受け入れ条件

- [ ] ShippingLabel が Order と ID参照で紐づく
- [ ] YamatoCompactLabel の有効期限チェックが正しく動作する
- [ ] 全メソッドにユニットテストがある`,
  },
  {
    title: "ポート（インターフェース）定義",
    labels: ["phase:1", "domain"],
    milestone: 1,
    body: `## 内容

ドメイン層のポート（インターフェース）を定義する

- \`OrderRepository\` — findById, findByStatus, findByBuyerName, save, exists, findAll
- \`ShippingLabelRepository\` — findById, findByOrderId（配列返却: 1:N対応）, save
- \`MessageTemplateRepository\` — findByType, save, resetToDefault
- \`ShippingLabelIssuer\` — issue(order, method)
- \`OrderFetcher\` — fetch(orderId, platform) → PlatformOrderData
- \`NotificationSender\` — notify(message)

## 変更範囲

\`\`\`
src/domain/ports/
├── OrderRepository.ts
├── ShippingLabelRepository.ts
├── MessageTemplateRepository.ts
├── ShippingLabelIssuer.ts
├── OrderFetcher.ts
└── NotificationSender.ts
\`\`\`

## 受け入れ条件

- [ ] 全てのポートが TypeScript interface として定義されている
- [ ] ドメイン層内に外部依存がない`,
  },
  {
    title: "ドメインサービス・仕様・ファクトリ実装",
    labels: ["phase:1", "domain"],
    milestone: 1,
    body: `## 内容

ドメインサービス、仕様パターン、ファクトリを実装する

- \`MessageGenerator\` — generate(order, template): Message
- \`MessageTemplate\` インターフェース（設定/読み取りモデル）
- \`OverdueOrderSpecification\` — 3日以上経過 + pending（DR-ORD-006）
- \`OrderFactory\` — createFromPlatformData(data): Order

## 変更範囲

\`\`\`
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
\`\`\`

## 依存

blocked by #8, #9, #10

## 受け入れ条件

- [ ] MessageGenerator がテンプレート変数を正しく置換する
- [ ] OverdueOrderSpecification が正しく判定する
- [ ] OrderFactory が PlatformOrderData から Order を生成できる
- [ ] 全てにユニットテストがある`,
  },
  // Phase 2
  {
    title: "インフラ層 — SpreadsheetOrderRepository 実装",
    labels: ["phase:2", "infrastructure"],
    milestone: 2,
    body: `## 内容

Google Sheets API を使った OrderRepository の実装

- SpreadsheetOrderRepository（implements OrderRepository）
- Google Sheets API との接続設定
- CRUD操作の実装

## 変更範囲

\`\`\`
src/infrastructure/
├── adapters/persistence/
│   ├── SpreadsheetOrderRepository.ts
│   └── __tests__/
│       └── SpreadsheetOrderRepository.test.ts
└── external/google/
    └── SheetsClient.ts
\`\`\`

## 依存

blocked by #10

## 受け入れ条件

- [ ] OrderRepository の全メソッドが実装されている
- [ ] 統合テストがある（モック or テスト用シート）`,
  },
  {
    title: "UC-003 発送前注文一覧を表示する",
    labels: ["phase:2", "application", "presentation"],
    milestone: 2,
    body: `## 内容

未発送の注文を一覧表示するユースケースとUIを実装する

- \`ListPendingOrdersUseCase\` — OrderRepository.findByStatus(pending) を使用
- 注文一覧画面のUI実装（発送前注文カード: 注文番号、購入者名、商品名、注文日、経過日数）
- 超過注文（3日以上）の警告表示（OverdueOrderSpecification）
- [購入お礼] ボタンの配置（Phase 3 で接続）

## 変更範囲

\`\`\`
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
\`\`\`

## 依存

blocked by #11, #12

## 受け入れ条件

- [ ] pending ステータスの注文のみ表示される
- [ ] 3日以上経過した注文に警告が表示される
- [ ] UC-003 のワイヤーフレームに沿ったUIである`,
  },
  {
    title: "UC-006 発送完了を記録する",
    labels: ["phase:2", "application", "presentation"],
    milestone: 2,
    body: `## 内容

注文のステータスを発送済みに更新するユースケースとUIを実装する

- \`MarkOrderAsShippedUseCase\` — Order.markAsShipped() を使用
- 発送完了確認ダイアログUI
- 追跡番号の入力（任意）
- 発送後の一覧更新

## 変更範囲

\`\`\`
src/application/usecases/
├── MarkOrderAsShippedUseCase.ts
└── __tests__/
    └── MarkOrderAsShippedUseCase.test.ts

src/presentation/components/orders/
├── ShipmentConfirmDialog.tsx
└── ShipmentCompleteMessage.tsx
\`\`\`

## 依存

blocked by #13

## 受け入れ条件

- [ ] 発送完了ボタン → 確認ダイアログ → ステータス更新の流れが動作する
- [ ] 追跡番号の入力・記録が動作する
- [ ] 発送済み注文が一覧から消える
- [ ] UC-006 のドメインルール（DR-ORD-003〜005）が適用される`,
  },
  {
    title: "UC-007 購入者情報を検索・参照する",
    labels: ["phase:2", "application", "presentation"],
    milestone: 2,
    body: `## 内容

過去の購入者情報を検索・閲覧するユースケースとUIを実装する

- \`SearchBuyersUseCase\` — OrderRepository.findByBuyerName() を使用
- 購入者検索UI（名前検索）
- 購入者詳細表示（住所、過去の注文履歴）

## 変更範囲

\`\`\`
src/application/usecases/
├── SearchBuyersUseCase.ts
└── __tests__/
    └── SearchBuyersUseCase.test.ts

src/presentation/
├── components/buyers/
│   ├── BuyerSearchForm.tsx
│   └── BuyerDetail.tsx
└── pages/buyers/
\`\`\`

## 依存

blocked by #12

## 受け入れ条件

- [ ] 購入者名での検索が動作する
- [ ] 購入者の詳細情報が表示される
- [ ] UC-007 の仕様に沿ったUIである`,
  },
  // Phase 3
  {
    title: "インフラ層 — LocalStorageMessageTemplateRepository 実装",
    labels: ["phase:3", "infrastructure"],
    milestone: 3,
    body: `## 内容

ブラウザの LocalStorage を使った MessageTemplateRepository の実装

- LocalStorageMessageTemplateRepository（implements MessageTemplateRepository）
- デフォルトテンプレートの初期値設定
- resetToDefault の実装

## 変更範囲

\`\`\`
src/infrastructure/adapters/persistence/
├── LocalStorageMessageTemplateRepository.ts
└── __tests__/
    └── LocalStorageMessageTemplateRepository.test.ts
\`\`\`

## 依存

blocked by #10

## 受け入れ条件

- [ ] MessageTemplateRepository の全メソッドが実装されている
- [ ] デフォルトテンプレートが正しく読み込まれる
- [ ] テストがある`,
  },
  {
    title: "UC-010 定型文を設定する",
    labels: ["phase:3", "application", "presentation"],
    milestone: 3,
    body: `## 内容

メッセージテンプレートの編集UIを実装する

- \`UpdateMessageTemplateUseCase\`
- テンプレート編集画面UI（購入お礼 / 発送連絡）
- 利用可能な変数の一覧表示
- プレビュー機能
- デフォルトに戻す機能

## 変更範囲

\`\`\`
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
\`\`\`

## 依存

blocked by #16

## 受け入れ条件

- [ ] テンプレートの編集・保存が動作する
- [ ] 変数一覧が表示される
- [ ] プレビューが動作する
- [ ] デフォルトに戻す機能が動作する
- [ ] DR-MSG-001（空テンプレート禁止）、DR-MSG-002（変数必須）が適用される`,
  },
  {
    title: "UC-008 購入お礼メッセージを作成する",
    labels: ["phase:3", "application", "presentation"],
    milestone: 3,
    body: `## 内容

購入お礼メッセージを生成しクリップボードにコピーする機能を実装する

- \`GeneratePurchaseThanksUseCase\` — MessageGenerator.generate() を使用
- 注文一覧の [購入お礼] ボタンと接続
- メッセージプレビュー → クリップボードコピー

## 変更範囲

\`\`\`
src/application/usecases/
├── GeneratePurchaseThanksUseCase.ts
└── __tests__/
    └── GeneratePurchaseThanksUseCase.test.ts

src/presentation/components/messages/
├── MessagePreviewDialog.tsx
└── CopyToClipboardButton.tsx

src/presentation/components/orders/
└── PendingOrderCard.tsx        # [購入お礼] ボタン接続（既存変更）
\`\`\`

## 依存

blocked by #13, #17

## 受け入れ条件

- [ ] [購入お礼] ボタン → メッセージ生成 → コピーの流れが動作する
- [ ] テンプレート変数（購入者名、商品名等）が正しく置換される
- [ ] コピー完了の通知が表示される`,
  },
  {
    title: "UC-009 発送連絡メッセージを作成する",
    labels: ["phase:3", "application", "presentation"],
    milestone: 3,
    body: `## 内容

発送連絡メッセージを生成しクリップボードにコピーする機能を実装する

- \`GenerateShippingNoticeUseCase\` — MessageGenerator.generate() を使用
- 発送完了後のフローに組み込み
- メッセージプレビュー → クリップボードコピー

## 変更範囲

\`\`\`
src/application/usecases/
├── GenerateShippingNoticeUseCase.ts
└── __tests__/
    └── GenerateShippingNoticeUseCase.test.ts

src/presentation/components/orders/
└── ShipmentCompleteMessage.tsx  # 発送連絡ボタン追加（既存変更）
\`\`\`

## 依存

blocked by #14, #17

## 受け入れ条件

- [ ] 発送完了後 → メッセージ生成 → コピーの流れが動作する
- [ ] テンプレート変数（購入者名、商品名、追跡番号等）が正しく置換される
- [ ] コピー完了の通知が表示される`,
  },
  // Phase 4
  {
    title: "インフラ層 — ShippingLabelIssuerImpl + ShippingLabelRepository 実装",
    labels: ["phase:4", "infrastructure"],
    milestone: 4,
    body: `## 内容

伝票発行の基盤となるインフラ層を実装する

- \`ShippingLabelIssuerImpl\`（implements ShippingLabelIssuer）— ClickPostGateway / YamatoCompactGateway の振り分け
- \`SpreadsheetShippingLabelRepository\`（implements ShippingLabelRepository）

## 変更範囲

\`\`\`
src/infrastructure/adapters/
├── shipping/
│   ├── ShippingLabelIssuerImpl.ts
│   └── __tests__/
│       └── ShippingLabelIssuerImpl.test.ts
└── persistence/
    ├── SpreadsheetShippingLabelRepository.ts
    └── __tests__/
        └── SpreadsheetShippingLabelRepository.test.ts
\`\`\`

## 依存

blocked by #10

## 受け入れ条件

- [ ] ShippingMethod に応じて正しい Gateway に振り分けられる
- [ ] ShippingLabelRepository の全メソッドが実装されている`,
  },
  {
    title: "UC-004 クリックポスト伝票を発行する",
    labels: ["phase:4", "application", "infrastructure", "presentation"],
    milestone: 4,
    body: `## 内容

Playwright でクリックポストのPDF伝票を発行する

- \`ClickPostAdapter\`（implements ClickPostGateway）
- Playwright でクリックポストサイトにアクセスし、伝票PDFを取得
- \`IssueShippingLabelUseCase\` のクリックポスト経路
- 伝票発行UIと結果表示

## 変更範囲

\`\`\`
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
\`\`\`

## 依存

blocked by #13, #20

## 受け入れ条件

- [ ] 注文一覧から伝票発行ボタン → クリックポスト伝票PDF取得の流れが動作する
- [ ] DR-LBL-002（発送前のみ発行可）、DR-LBL-003（重複発行警告）が適用される
- [ ] エラー時のハンドリングが適切`,
  },
  {
    title: "UC-005 宅急便コンパクト伝票を発行する",
    labels: ["phase:4", "infrastructure", "presentation"],
    milestone: 4,
    body: `## 内容

Playwright でヤマト運輸のQRコードを発行する

- \`YamatoCompactAdapter\`（implements YamatoCompactGateway）
- Playwright でヤマト運輸PUDOサイトにアクセスし、QRコードを取得
- \`IssueShippingLabelUseCase\` の宅急便コンパクト経路
- DR-LBL-001: 14日間有効期限の表示

## 変更範囲

\`\`\`
src/infrastructure/adapters/shipping/
├── YamatoCompactAdapter.ts
└── __tests__/
    └── YamatoCompactAdapter.test.ts

src/infrastructure/external/playwright/
└── YamatoPudoPage.ts

src/presentation/components/labels/
└── LabelResultView.tsx          # QRコード・有効期限表示の追加（既存変更）
\`\`\`

## 依存

blocked by #13, #20

## 受け入れ条件

- [ ] 注文一覧から伝票発行ボタン → QRコード取得の流れが動作する
- [ ] 有効期限が表示される
- [ ] DR-LBL-002, DR-LBL-003 が適用される`,
  },
  // Phase 5
  {
    title: "インフラ層 — GmailAdapter + PlatformAdapter 実装",
    labels: ["phase:5", "infrastructure"],
    milestone: 5,
    body: `## 内容

メール監視とプラットフォームスクレイピングの基盤を実装する

- Gmail API による購入通知メール監視
- メール本文から注文IDの抽出
- \`MinneAdapter\`（implements OrderFetcher）— Playwright で minne から購入者情報取得
- \`CreemaAdapter\`（implements OrderFetcher）— Playwright で creema から購入者情報取得
- \`OrderFactory.createFromPlatformData()\` との接続

## 変更範囲

\`\`\`
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
\`\`\`

## 依存

blocked by #11, #12

## 受け入れ条件

- [ ] Gmail から購入通知メールを検出できる
- [ ] minne/creema から購入者情報を取得できる
- [ ] PlatformOrderData → Order への変換が正しく動作する`,
  },
  {
    title: "UC-001 購入情報を自動取得する",
    labels: ["phase:5", "application"],
    milestone: 5,
    body: `## 内容

メール検知から注文登録までの自動パイプラインを実装する

- \`FetchOrderUseCase\` の実装
- Gmail Poller（定期実行 or Webhook）
- 注文取得 → 重複チェック（DR-ORD-001）→ 登録の流れ
- 失敗時のエラーハンドリング（注文は登録しない）

## 変更範囲

\`\`\`
src/application/usecases/
├── FetchOrderUseCase.ts
└── __tests__/
    └── FetchOrderUseCase.test.ts

src/infrastructure/adapters/platform/
└── GmailPoller.ts
\`\`\`

## 依存

blocked by #23

## 受け入れ条件

- [ ] メール受信 → 注文情報取得 → スプレッドシート保存の流れが動作する
- [ ] 重複注文がスキップされる
- [ ] 取得失敗時にエラー通知が送信される`,
  },
  {
    title: "インフラ層 — SlackAdapter 実装",
    labels: ["phase:5", "infrastructure"],
    milestone: 5,
    body: `## 内容

Slack Webhook による通知機能を実装する

- \`SlackAdapter\`（implements NotificationSender）
- Slack Webhook の設定
- 通知メッセージのフォーマット（新規注文通知、エラー通知）

## 変更範囲

\`\`\`
src/infrastructure/adapters/notification/
├── SlackAdapter.ts
└── __tests__/
    └── SlackAdapter.test.ts
\`\`\`

## 依存

blocked by #10

## 受け入れ条件

- [ ] Slack に通知メッセージが送信される
- [ ] エラー通知が送信される`,
  },
  {
    title: "UC-002 新規注文を通知する",
    labels: ["phase:5", "application"],
    milestone: 5,
    body: `## 内容

新規注文登録後の Slack 通知を実装する

- \`NotifyNewOrderUseCase\` の実装
- OrderRegistered イベント → Slack 通知
- OrderFetchFailed イベント → エラー通知

## 変更範囲

\`\`\`
src/application/usecases/
├── NotifyNewOrderUseCase.ts
└── __tests__/
    └── NotifyNewOrderUseCase.test.ts
\`\`\`

## 依存

blocked by #24, #25

## 受け入れ条件

- [ ] 新規注文登録後に Slack 通知が送信される
- [ ] 注文取得失敗時にエラー通知が送信される`,
  },
];

// ---- Main ----

async function main() {
  console.log("=== GitHub Issues 一括作成 ===\n");

  // Check rate limit first
  const rateCheck = await apiCall("GET", "/rate_limit");
  const remaining = rateCheck.body?.rate?.remaining ?? rateCheck.body?.resources?.core?.remaining ?? 0;
  const needed = milestones.length + labels.length + issues.length;
  console.log(`API Rate Limit: ${remaining} remaining, ${needed} needed`);

  if (remaining < needed) {
    const resetTime = rateCheck.body?.rate?.reset ?? rateCheck.body?.resources?.core?.reset ?? 0;
    const waitSecs = Math.max(0, resetTime - Math.floor(Date.now() / 1000));
    console.log(`⏳ Rate limit insufficient. Waiting ${waitSecs}s for reset...`);
    await sleep((waitSecs + 5) * 1000);
  }

  // 1. Create milestones
  console.log("\n--- Creating Milestones ---");
  const milestoneNumbers = {};
  for (let i = 0; i < milestones.length; i++) {
    const ms = milestones[i];
    const result = await apiCall(
      "POST",
      `/repos/${OWNER}/${REPO}/milestones`,
      { title: ms.title, description: ms.description }
    );
    if (result.statusCode === 201) {
      milestoneNumbers[i] = result.body.number;
      console.log(`  ✅ Milestone ${i}: ${ms.title} (number: ${result.body.number})`);
    } else if (result.statusCode === 422) {
      // Already exists, find it
      console.log(`  ⚠️  Milestone "${ms.title}" may already exist, searching...`);
      const listResult = await apiCall("GET", `/repos/${OWNER}/${REPO}/milestones?state=open&per_page=100`);
      const existing = listResult.body?.find?.((m) => m.title === ms.title);
      if (existing) {
        milestoneNumbers[i] = existing.number;
        console.log(`  ✅ Found existing milestone (number: ${existing.number})`);
      } else {
        console.log(`  ❌ Failed: ${JSON.stringify(result.body)}`);
      }
    } else {
      console.log(`  ❌ Failed (${result.statusCode}): ${JSON.stringify(result.body)}`);
    }
    await sleep(500);
  }

  // 2. Create labels
  console.log("\n--- Creating Labels ---");
  for (const label of labels) {
    const result = await apiCall("POST", `/repos/${OWNER}/${REPO}/labels`, label);
    if (result.statusCode === 201) {
      console.log(`  ✅ Label: ${label.name}`);
    } else if (result.statusCode === 422) {
      console.log(`  ⚠️  Label "${label.name}" already exists`);
    } else {
      console.log(`  ❌ Label "${label.name}" failed (${result.statusCode}): ${JSON.stringify(result.body)}`);
    }
    await sleep(300);
  }

  // 3. Create issues (in order, so issue numbers match)
  console.log("\n--- Creating Issues ---");
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const payload = {
      title: issue.title,
      body: issue.body,
      labels: issue.labels,
    };
    if (milestoneNumbers[issue.milestone] !== undefined) {
      payload.milestone = milestoneNumbers[issue.milestone];
    }
    const result = await apiCall(
      "POST",
      `/repos/${OWNER}/${REPO}/issues`,
      payload
    );
    if (result.statusCode === 201) {
      console.log(`  ✅ #${result.body.number}: ${issue.title}`);
    } else {
      console.log(`  ❌ Issue "${issue.title}" failed (${result.statusCode}): ${JSON.stringify(result.body).substring(0, 200)}`);
    }
    await sleep(500);
  }

  console.log("\n=== 完了 ===");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
