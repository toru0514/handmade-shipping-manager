# ハンドメイド発送管理システム

ハンドメイド作品の発送伝票発行を効率化するシステムです。

## 概要

minne、creemaなどのハンドメイドプラットフォームで販売した作品の発送作業を自動化・効率化します。

### 主な機能

- 📧 **購入情報自動取得**: Gmailの購入通知をトリガーに、Playwrightでminne/creemaから購入者情報を自動取得
- 🔔 **Slack通知**: 新規注文をSlackで即時通知
- 📋 **発送管理ダッシュボード**: 未発送の注文を一覧表示
- 📮 **クリックポスト伝票発行**: 購入者情報を自動入力してPDF伝票を発行
- 📦 **宅急便コンパクト伝票発行**: PUDO用QRコードを自動発行
- 🔍 **購入者検索**: 過去の購入履歴やリピーター情報を検索

### 処理フロー

```
1. 【自動】Gmailで購入通知メールを検知
2. 【自動】メールから注文IDを抽出
3. 【自動】Playwrightでminne/creemaから購入者情報を取得
4. 【自動】スプレッドシートに保存 + Slack通知
5. 【手動】伝票発行ボタンをクリック
6. 【自動】クリックポスト/宅急便コンパクトの伝票を発行
7. 【手動】発送完了を記録
```

## アーキテクチャ

### 設計思想

- **ドメイン駆動設計（DDD）**: 松岡幸一郎氏の「ドメイン駆動設計入門」に基づく設計
- **ヘキサゴナルアーキテクチャ**: ドメイン層を中心に据えた疎結合な設計
- **テスト駆動開発（TDD）**: 各層に対するテストを実装

### 技術スタック

- **フロントエンド**: Next.js, MUI (Material UI), TailwindCSS
- **バックエンド**: Next.js API Routes
- **データストア**: Google Spreadsheet
- **外部連携**:
  - Gmail API
  - Slack Webhook
  - Playwright（クリックポスト・ヤマト運輸の自動操作）

## ドキュメント

- [ユースケース一覧](./docs/usecases/README.md)
- [ドメインモデル](./docs/domain/README.md)
- [アーキテクチャ](./docs/architecture/README.md)

## 開発予定

### Phase 1: 基盤構築
- [ ] プロジェクトセットアップ（Next.js + shadcn）
- [ ] ドメインモデル実装
- [ ] スプレッドシート連携

### Phase 2: 注文管理
- [ ] Gmail連携（購入メール取得）
- [ ] Slack通知
- [ ] 発送管理ダッシュボード

### Phase 3: 伝票発行
- [ ] クリックポスト自動化（Playwright）
- [ ] 宅急便コンパクト自動化（Playwright）

### Phase 4: 拡張機能
- [ ] 購入者検索
- [ ] 発送履歴管理
- [ ] バッチ処理対応

## セットアップ

```bash
# 依存関係のインストール
bun install

# Playwright (Chromium) のインストール
bun run playwright:install

# 開発サーバー起動
bun run dev

# テスト実行
bun run test
```

## Playwright 実行環境について

- 伝票発行 API はサーバーサイドで Playwright (Chromium) を実行します。
- そのため、ブラウザ実行が可能な環境（VM / コンテナ / 自前サーバーなど）での運用を前提としています。
- Vercel Serverless Functions 上での Playwright 実行は制約が多く、現構成では非推奨です。

## 環境変数

```env
# Google API（サービスアカウントJSONをbase64化した値）
GOOGLE_SERVICE_ACCOUNT_BASE64=

# 発送管理スプレッドシート（必須）
SHIPPING_SPREADSHEET_ID=
SHIPPING_ORDERS_SHEET_NAME=Orders

# Google OAuth（注文自動取得に必要）
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Slack
SLACK_WEBHOOK_URL=

# minne
MINNE_EMAIL=
MINNE_PASSWORD=

# creema
CREEMA_EMAIL=
CREEMA_PASSWORD=

# クリックポスト
CLICKPOST_EMAIL=
CLICKPOST_PASSWORD=

# ヤマト運輸（クロネコメンバーズ）
YAMATO_MEMBER_ID=
YAMATO_PASSWORD=
```

`GOOGLE_SERVICE_ACCOUNT_BASE64` は次のコマンドで作成できます。

```bash
node -e "const fs=require('fs');process.stdout.write(Buffer.from(fs.readFileSync('service-account.json','utf8')).toString('base64'))"
```

## ライセンス

Private
