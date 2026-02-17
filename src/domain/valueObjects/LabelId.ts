/**
 * LabelId — 伝票ID
 */
export class LabelId {
  readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('伝票IDは空にできません');
    }
    this.value = value.trim();
  }

  equals(other: LabelId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
