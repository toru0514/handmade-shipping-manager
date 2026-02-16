# イベントストーミング

## 概要

イベントストーミングはAlberto Brandoliniが考案したワークショップ手法で、
ドメインイベントを中心にシステムの振る舞いを可視化します。

## 凡例

| 色 | 要素 | 説明 |
|----|------|------|
| 🟧 オレンジ | ドメインイベント | 過去形で表現。「〜された」 |
| 🟦 青 | コマンド | 命令形で表現。「〜する」 |
| 🟨 黄 | アクター | コマンドを発行する人・システム |
| 🟪 紫 | ポリシー | イベントに反応して次のコマンドを発行 |
| 🟩 緑 | 読み取りモデル | 意思決定に必要な情報 |
| 📦 | 集約 | コマンドを処理しイベントを発行 |

## イベントフロー全体図

```mermaid
flowchart LR
    subgraph Trigger["トリガー"]
        Gmail["📧 購入通知メール"]
    end

    subgraph OrderFlow["注文フロー"]
        E1["🟧 購入通知メール受信"]
        C1["🟦 注文情報を取得する"]
        E2["🟧 注文情報取得成功"]
        E2F["🟧 注文情報取得失敗"]
        C2["🟦 注文を登録する"]
        E3["🟧 注文登録済み"]
        E3D["🟧 重複注文スキップ"]
    end

    subgraph NotifyFlow["通知フロー"]
        P1["🟪 注文登録時に通知"]
        C3["🟦 Slack通知を送信する"]
        E4["🟧 新規注文通知済み"]
        E4F["🟧 通知失敗"]
    end

    subgraph LabelFlow["伝票発行フロー"]
        RM1["🟩 発送前注文一覧"]
        C4["🟦 伝票を発行する"]
        E5["🟧 伝票発行済み"]
        E5F["🟧 伝票発行失敗"]
    end

    subgraph ShipFlow["発送フロー"]
        C5["🟦 発送完了を記録する"]
        E6["🟧 発送完了記録済み"]
    end

    subgraph MessageFlow["メッセージフロー"]
        C6["🟦 購入お礼メッセージを生成する"]
        E7["🟧 購入お礼メッセージ生成済み"]
        C7["🟦 発送連絡メッセージを生成する"]
        E8["🟧 発送連絡メッセージ生成済み"]
    end

    subgraph TemplateFlow["定型文設定フロー"]
        C8["🟦 定型文テンプレートを更新する"]
        E9["🟧 定型文テンプレート更新済み"]
    end

    Gmail --> E1
    E1 --> C1
    C1 --> E2
    C1 --> E2F
    E2 --> C2
    C2 --> E3
    C2 --> E3D
    E3 --> P1
    P1 --> C3
    C3 --> E4
    C3 --> E4F
    E3 --> RM1
    RM1 --> C6
    C6 --> E7
    RM1 --> C4
    C4 --> E5
    C4 --> E5F
    E5 --> C5
    C5 --> E6
    E6 --> C7
    C7 --> E8
    C8 --> E9
    E9 -.->|"テンプレート反映"| C6
    E9 -.->|"テンプレート反映"| C7
```

## 詳細イベントストーミング

### 1. 注文取得フロー

```mermaid
flowchart TD
    subgraph Actor1["🟨 アクター"]
        System["システム<br/>（Gmail Poller）"]
    end

    subgraph Events1["イベント・コマンド"]
        E1["🟧 PurchaseEmailReceived<br/>購入通知メール受信"]
        C1["🟦 FetchOrderFromPlatform<br/>注文情報を取得する"]
        A1["📦 Order"]
        E2["🟧 OrderFetched<br/>注文情報取得成功"]
        E2F["🟧 OrderFetchFailed<br/>注文情報取得失敗"]
    end

    subgraph ReadModel1["🟩 読み取りモデル"]
        RM1["メール本文<br/>（注文ID抽出用）"]
        RM2["プラットフォーム画面<br/>（購入者情報）"]
    end

    System --> E1
    E1 --> C1
    RM1 -.-> C1
    RM2 -.-> C1
    C1 --> A1
    A1 --> E2
    A1 --> E2F

    style E1 fill:#ff9900
    style E2 fill:#ff9900
    style E2F fill:#ff9900
    style C1 fill:#3399ff
    style A1 fill:#ffcc00
```

### 2. 注文登録フロー

```mermaid
flowchart TD
    subgraph Trigger2["トリガー"]
        E2["🟧 OrderFetched<br/>注文情報取得成功"]
    end

    subgraph Policy2["🟪 ポリシー"]
        P1["取得成功時に<br/>注文を登録する"]
    end

    subgraph Events2["イベント・コマンド"]
        C2["🟦 RegisterOrder<br/>注文を登録する"]
        A2["📦 Order"]
        E3["🟧 OrderRegistered<br/>注文登録済み"]
        E3D["🟧 DuplicateOrderSkipped<br/>重複注文スキップ"]
    end

    subgraph Rule2["ドメインルール"]
        DR1["DR-ORD-001<br/>注文ID一意性"]
        DR2["DR-ORD-002<br/>必須項目チェック"]
    end

    E2 --> P1
    P1 --> C2
    C2 --> A2
    DR1 -.-> A2
    DR2 -.-> A2
    A2 --> E3
    A2 --> E3D

    style E2 fill:#ff9900
    style E3 fill:#ff9900
    style E3D fill:#ff9900
    style C2 fill:#3399ff
    style P1 fill:#cc99ff
```

### 3. 通知フロー

```mermaid
flowchart TD
    subgraph Trigger3["トリガー"]
        E3["🟧 OrderRegistered<br/>注文登録済み"]
        E2F["🟧 OrderFetchFailed<br/>注文情報取得失敗"]
    end

    subgraph Policy3["🟪 ポリシー"]
        P2["注文登録時に<br/>Slack通知する"]
        P3["取得失敗時に<br/>エラー通知する"]
    end

    subgraph Events3["イベント・コマンド"]
        C3["🟦 SendNotification<br/>通知を送信する"]
        E4["🟧 NotificationSent<br/>通知送信済み"]
        E4F["🟧 NotificationFailed<br/>通知失敗"]
    end

    E3 --> P2
    E2F --> P3
    P2 --> C3
    P3 --> C3
    C3 --> E4
    C3 --> E4F

    style E3 fill:#ff9900
    style E2F fill:#ff9900
    style E4 fill:#ff9900
    style E4F fill:#ff9900
    style C3 fill:#3399ff
    style P2 fill:#cc99ff
    style P3 fill:#cc99ff
```

### 4. 伝票発行フロー

```mermaid
flowchart TD
    subgraph Actor4["🟨 アクター"]
        Creator["作家"]
    end

    subgraph ReadModel4["🟩 読み取りモデル"]
        RM4["発送前注文一覧"]
    end

    subgraph Events4["イベント・コマンド"]
        C4["🟦 IssueShippingLabel<br/>伝票を発行する"]
        A4["📦 ShippingLabel"]
        E5["🟧 ShippingLabelIssued<br/>伝票発行済み"]
        E5F["🟧 ShippingLabelIssueFailed<br/>伝票発行失敗"]
    end

    subgraph Rule4["ドメインルール"]
        DR3["DR-LBL-002<br/>発送前のみ発行可"]
        DR4["DR-LBL-003<br/>重複発行警告"]
    end

    subgraph Input4["入力"]
        SM["ShippingMethod<br/>click_post / yamato_compact"]
    end

    Creator --> RM4
    RM4 --> C4
    SM --> C4
    C4 --> A4
    DR3 -.-> A4
    DR4 -.-> A4
    A4 --> E5
    A4 --> E5F

    style E5 fill:#ff9900
    style E5F fill:#ff9900
    style C4 fill:#3399ff
    style RM4 fill:#99ff99
```

### 5. 発送完了フロー

```mermaid
flowchart TD
    subgraph Actor5["🟨 アクター"]
        Creator["作家"]
    end

    subgraph Events5["イベント・コマンド"]
        C5["🟦 MarkOrderAsShipped<br/>発送完了を記録する"]
        A5["📦 Order"]
        E6["🟧 OrderShipped<br/>発送完了記録済み"]
    end

    subgraph Rule5["ドメインルール"]
        DR5["DR-ORD-003<br/>ステータス遷移"]
        DR6["DR-ORD-004<br/>発送済み変更不可"]
        DR7["DR-ORD-005<br/>発送日時記録"]
    end

    subgraph Input5["入力"]
        TN["TrackingNumber<br/>追跡番号（任意）"]
    end

    Creator --> C5
    TN --> C5
    C5 --> A5
    DR5 -.-> A5
    DR6 -.-> A5
    DR7 -.-> A5
    A5 --> E6

    style E6 fill:#ff9900
    style C5 fill:#3399ff
```

### 6. メッセージ生成フロー（購入お礼）

```mermaid
flowchart TD
    subgraph Actor6["🟨 アクター"]
        Creator6["作家"]
    end

    subgraph ReadModel6["🟩 読み取りモデル"]
        RM6["発送前注文一覧"]
    end

    subgraph Events6["イベント・コマンド"]
        C6["🟦 GeneratePurchaseThanksMessage<br/>購入お礼メッセージを生成する"]
        DS6["💎 MessageGenerator<br/>（ドメインサービス）"]
        E7["🟧 PurchaseThanksMessageGenerated<br/>購入お礼メッセージ生成済み"]
    end

    subgraph Input6["入力"]
        Template6["MessageTemplate<br/>（購入お礼テンプレート）"]
    end

    subgraph Rule6["ドメインルール"]
        DR8["DR-MSG-001<br/>空テンプレート禁止"]
        DR9["DR-MSG-002<br/>変数必須"]
    end

    Creator6 --> RM6
    RM6 --> C6
    Template6 --> DS6
    C6 --> DS6
    DR8 -.-> DS6
    DR9 -.-> DS6
    DS6 --> E7

    style E7 fill:#ff9900
    style C6 fill:#3399ff
    style RM6 fill:#99ff99
```

### 7. メッセージ生成フロー（発送連絡）

```mermaid
flowchart TD
    subgraph Actor7["🟨 アクター"]
        Creator7["作家"]
    end

    subgraph Trigger7["トリガー"]
        E6["🟧 OrderShipped<br/>発送完了記録済み"]
    end

    subgraph Events7["イベント・コマンド"]
        C7["🟦 GenerateShippingNoticeMessage<br/>発送連絡メッセージを生成する"]
        DS7["💎 MessageGenerator<br/>（ドメインサービス）"]
        E8["🟧 ShippingNoticeMessageGenerated<br/>発送連絡メッセージ生成済み"]
    end

    subgraph Input7["入力"]
        Template7["MessageTemplate<br/>（発送連絡テンプレート）"]
    end

    subgraph Rule7["ドメインルール"]
        DR10["DR-MSG-001<br/>空テンプレート禁止"]
        DR11["DR-MSG-002<br/>変数必須"]
    end

    E6 --> Creator7
    Creator7 --> C7
    Template7 --> DS7
    C7 --> DS7
    DR10 -.-> DS7
    DR11 -.-> DS7
    DS7 --> E8

    style E6 fill:#ff9900
    style E8 fill:#ff9900
    style C7 fill:#3399ff
```

### 8. 定型文設定フロー

```mermaid
flowchart TD
    subgraph Actor8["🟨 アクター"]
        Creator8["作家"]
    end

    subgraph Events8["イベント・コマンド"]
        C8["🟦 UpdateMessageTemplate<br/>定型文テンプレートを更新する"]
        E9["🟧 MessageTemplateUpdated<br/>定型文テンプレート更新済み"]
    end

    subgraph Rule8["ドメインルール"]
        DR12["DR-MSG-001<br/>空テンプレート禁止"]
        DR13["DR-MSG-002<br/>変数必須"]
    end

    subgraph Input8["入力"]
        Type8["MessageTemplateType<br/>purchase_thanks / shipping_notice"]
        Content8["テンプレート本文"]
    end

    Creator8 --> C8
    Type8 --> C8
    Content8 --> C8
    DR12 -.-> C8
    DR13 -.-> C8
    C8 --> E9

    style E9 fill:#ff9900
    style C8 fill:#3399ff
```

## ドメインイベント一覧

| イベント名 | 日本語名 | 発生条件 | 発行元集約 |
|-----------|---------|---------|-----------|
| PurchaseEmailReceived | 購入通知メール受信 | Gmailで購入通知検出 | - |
| OrderFetched | 注文情報取得成功 | プラットフォームから情報取得成功 | Order |
| OrderFetchFailed | 注文情報取得失敗 | プラットフォームから情報取得失敗 | - |
| OrderRegistered | 注文登録済み | 新規注文がスプレッドシートに保存 | Order |
| DuplicateOrderSkipped | 重複注文スキップ | 既存の注文IDと重複 | Order |
| NotificationSent | 通知送信済み | Slack通知成功 | - |
| NotificationFailed | 通知失敗 | Slack通知失敗 | - |
| ShippingLabelIssued | 伝票発行済み | 伝票PDF/QRコード発行成功 | ShippingLabel |
| ShippingLabelIssueFailed | 伝票発行失敗 | 伝票発行失敗 | - |
| OrderShipped | 発送完了記録済み | ステータスが発送済みに変更 | Order |
| PurchaseThanksMessageGenerated | 購入お礼メッセージ生成済み | 購入お礼メッセージが生成された | - |
| ShippingNoticeMessageGenerated | 発送連絡メッセージ生成済み | 発送連絡メッセージが生成された | - |
| MessageTemplateUpdated | 定型文テンプレート更新済み | テンプレートが保存された | - |

## コマンド一覧

| コマンド名 | 日本語名 | 発行者 | 対象集約 |
|-----------|---------|-------|---------|
| FetchOrderFromPlatform | 注文情報を取得する | システム | Order |
| RegisterOrder | 注文を登録する | システム | Order |
| SendNotification | 通知を送信する | システム | - |
| IssueShippingLabel | 伝票を発行する | 作家 | ShippingLabel |
| MarkOrderAsShipped | 発送完了を記録する | 作家 | Order |
| GeneratePurchaseThanksMessage | 購入お礼メッセージを生成する | 作家 | - (ドメインサービス) |
| GenerateShippingNoticeMessage | 発送連絡メッセージを生成する | 作家 | - (ドメインサービス) |
| UpdateMessageTemplate | 定型文テンプレートを更新する | 作家 | - (設定) |

## ポリシー一覧

| ポリシー | トリガーイベント | 発行コマンド |
|---------|-----------------|-------------|
| 注文取得成功時に登録 | OrderFetched | RegisterOrder |
| 注文登録時に通知 | OrderRegistered | SendNotification |
| 取得失敗時にエラー通知 | OrderFetchFailed | SendNotification |

## 気づき・検討事項

### 集約境界の確認ポイント

以下の検討事項は[集約設計](./aggregate-design.md)で解決済みです。

1. **Order と ShippingLabel の関係** → **解決済み**: 別々の集約（IDで参照）
   - ShippingLabel は Order を参照するが、Order は ShippingLabel を持たない
   - 不変条件・ライフサイクルが異なるため、別々の集約が適切

2. **伝票発行時のステータス更新** → **解決済み**: 2状態（pending → shipped）を維持
   - 「伝票発行済み」は ShippingLabel の存在で判断できる
   - 中間状態を増やすことによる複雑性を回避

3. **メッセージテンプレートの位置づけ** → **解決済み**: ドメインサービス + 設定
   - MessageGenerator（ドメインサービス）が Order + MessageTemplate から Message を生成
   - MessageTemplate は集約ではなく設定/読み取りモデルとして扱う

## 関連ドキュメント

- [集約境界の検証](./aggregate-design.md) - 上記の検討事項の詳細な分析と結論
- [ドメインモデル](./README.md) - エンティティ、値オブジェクト、ドメインサービスの定義
