/**
 * Platform — 販売プラットフォーム（DR-PLT-001: minne / creema のみ対応）
 */
export const PlatformValues = ['minne', 'creema'] as const;
export type PlatformValue = (typeof PlatformValues)[number];

export class Platform {
  readonly value: PlatformValue;

  constructor(value: string) {
    if (!PlatformValues.includes(value as PlatformValue)) {
      throw new Error(`不正なプラットフォームです: ${value}（minne / creema のみ対応）`);
    }
    this.value = value as PlatformValue;
  }

  static readonly Minne = new Platform('minne');
  static readonly Creema = new Platform('creema');

  equals(other: Platform): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
