/**
 * Message — 生成済みメッセージ（空文字不可）
 */
export class Message {
  readonly content: string;

  constructor(content: string) {
    if (!content || content.trim().length === 0) {
      throw new Error('メッセージは空にできません');
    }
    this.content = content;
  }

  equals(other: Message): boolean {
    return this.content === other.content;
  }

  toString(): string {
    return this.content;
  }
}
