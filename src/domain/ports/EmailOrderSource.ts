/** メール経由で注文IDを取得するためのポート */

export interface UnreadOrderRef {
  /** メールメッセージID（既読化に使用） */
  readonly messageId: string;
  /** プラットフォームの注文ID */
  readonly orderId: string;
}

export interface EmailOrderSourceOptions {
  /** この日数以内に受信したメールのみを対象にする（デフォルト: 30） */
  readonly withinDays?: number;
}

export interface EmailOrderSource {
  /**
   * 未読の購入通知メールから注文IDの一覧を取得する。
   */
  fetchUnreadOrderRefs(options?: EmailOrderSourceOptions): Promise<UnreadOrderRef[]>;

  /**
   * 指定メッセージを既読にマークする。
   */
  markAsRead(messageId: string): Promise<void>;
}
