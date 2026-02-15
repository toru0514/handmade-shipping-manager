# アーキテクチャ

## 概要

ハンドメイド発送管理システムのアーキテクチャを定義します。
ヘキサゴナルアーキテクチャ（Ports and Adapters）を採用し、ドメイン層を中心に据えた疎結合な設計を目指します。

## レイヤー構成

```mermaid
flowchart TB
    subgraph Presentation["プレゼンテーション層"]
        NextAPI["Next.js API Routes"]
        WebUI["Web UI"]
    end

    subgraph Application["アプリケーション層"]
        UC["ユースケース"]
    end

    subgraph Domain["ドメイン層"]
        Entity["エンティティ"]
        VO["値オブジェクト"]
        DomainService["ドメインサービス"]
        Repository["リポジトリ（インターフェース）"]
    end

    subgraph Infrastructure["インフラストラクチャ層"]
        SpreadsheetRepo["Spreadsheet Repository"]
        PlaywrightAdapter["Playwright Adapters"]
        SlackAdapter["Slack Webhook"]
        GmailAdapter["Gmail Adapter"]
    end

    WebUI --> NextAPI
    NextAPI --> UC
    UC --> Entity
    UC --> DomainService
    UC --> Repository
    Repository -.->|実装| SpreadsheetRepo
    DomainService -.->|実装| PlaywrightAdapter
    DomainService -.->|実装| SlackAdapter
    DomainService -.->|実装| GmailAdapter
```

## ヘキサゴナルアーキテクチャ

```mermaid
flowchart TB
    subgraph PrimaryAdapters["プライマリアダプター（駆動する側）"]
        NextJS["Next.js API Routes"]
        GmailPoller["Gmail Poller"]
        CLI["CLI"]
    end

    subgraph InputPorts["入力ポート"]
        FetchOrder["FetchOrderFromPlatformUseCase"]
        IssueClickPost["IssueClickPostLabelUseCase"]
        IssueYamato["IssueYamatoCompactLabelUseCase"]
        MarkShipped["MarkOrderAsShippedUseCase"]
        SearchBuyers["SearchBuyersUseCase"]
        NotifyOrder["NotifyNewOrderUseCase"]
    end

    subgraph DomainLayer["ドメイン層"]
        Entities["エンティティ・値オブジェクト"]
        DomainServices["ドメインサービス"]
        Specifications["仕様"]
    end

    subgraph OutputPorts["出力ポート（インターフェース）"]
        OrderRepo["OrderRepository"]
        LabelRepo["ShippingLabelRepository"]
        NotificationSvc["NotificationService"]
        PlatformScraper["PlatformScraperService"]
        ClickPostSvc["ClickPostService"]
        YamatoSvc["YamatoService"]
        EmailSvc["EmailService"]
    end

    subgraph SecondaryAdapters["セカンダリアダプター（駆動される側）"]
        Spreadsheet["Google Spreadsheet"]
        Playwright["Playwright"]
        Slack["Slack Webhook"]
        Gmail["Gmail API"]
    end

    PrimaryAdapters --> InputPorts
    InputPorts --> DomainLayer
    DomainLayer --> OutputPorts
    OutputPorts -.->|実装| SecondaryAdapters
```

## 依存関係のルール

```
プレゼンテーション層 → アプリケーション層 → ドメイン層 ← インフラストラクチャ層
```

- **ドメイン層は他の層に依存しない**
- インフラストラクチャ層はドメイン層のインターフェースを実装する（依存性逆転）
- アプリケーション層はドメイン層のインターフェースを通じてインフラストラクチャ層を利用する

## コンテキストマップ

```mermaid
flowchart TB
    subgraph System["発送管理システム"]
        subgraph OrderContext["注文管理コンテキスト"]
            Order["Order"]
            Buyer["Buyer"]
            Product["Product"]
        end

        subgraph ShippingContext["配送管理コンテキスト"]
            ShippingLabel["ShippingLabel"]
            ClickPost["ClickPostLabel"]
            YamatoCompact["YamatoCompactLabel"]
        end

        subgraph NotificationContext["通知コンテキスト"]
            SlackNotifier["SlackNotifier"]
        end

        subgraph ExternalContext["外部連携コンテキスト"]
            GmailAdapterCtx["GmailAdapter"]
            SpreadsheetRepo["SpreadsheetRepository"]
            PlatformScraperCtx["PlatformScraper"]
            ClickPostClient["ClickPostClient"]
            YamatoClient["YamatoClient"]
        end
    end

    OrderContext <--> ShippingContext
    OrderContext --> NotificationContext
    OrderContext --> ExternalContext
    ShippingContext --> ExternalContext
```

## データフロー

```mermaid
flowchart TD
    Gmail["📧 Gmail<br/>購入通知メール"]
    EmailService["EmailService<br/>メールから注文IDを抽出"]
    PlatformScraper["PlatformScraper<br/>Playwrightでminne/creemaから<br/>購入者情報取得"]
    OrderRepository["OrderRepository<br/>スプレッドシートに保存"]
    NotificationSvc["NotificationService<br/>Slackに通知"]
    Dashboard["📱 ダッシュボード<br/>発送前注文一覧"]
    LabelService["ShippingLabelService<br/>伝票発行"]
    ClickPost["📮 クリックポスト<br/>PDF伝票"]
    Yamato["📦 宅急便コンパクト<br/>QRコード"]

    Gmail --> EmailService
    EmailService --> PlatformScraper
    PlatformScraper --> OrderRepository
    OrderRepository --> NotificationSvc
    OrderRepository --> Dashboard
    Dashboard --> LabelService
    LabelService --> ClickPost
    LabelService --> Yamato
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| プレゼンテーション層 | Next.js, React, shadcn/ui, TailwindCSS |
| アプリケーション層 | Next.js API Routes |
| ドメイン層 | TypeScript |
| インフラストラクチャ層 | Google Sheets API, Gmail API, Playwright, Slack Webhook |

## ディレクトリ構成（予定）

```
src/
├── presentation/          # プレゼンテーション層
│   ├── components/        # UIコンポーネント
│   └── pages/             # Next.js pages
│
├── application/           # アプリケーション層
│   └── usecases/          # ユースケース
│
├── domain/                # ドメイン層
│   ├── entities/          # エンティティ
│   ├── valueObjects/      # 値オブジェクト
│   ├── services/          # ドメインサービス
│   ├── repositories/      # リポジトリインターフェース
│   └── specifications/    # 仕様
│
└── infrastructure/        # インフラストラクチャ層
    ├── repositories/      # リポジトリ実装
    ├── adapters/          # 外部サービスアダプター
    │   ├── playwright/    # Playwright関連
    │   ├── gmail/         # Gmail API
    │   └── slack/         # Slack Webhook
    └── config/            # 設定
```

## 関連ドキュメント

- [ドメインモデル](../domain/README.md)
- [ユースケース](../usecases/README.md)
