import { describe, expect, it } from 'vitest';
import { buildDescriptionPrompt } from '../ProductDescriptionPromptBuilder';

describe('buildDescriptionPrompt', () => {
  it('木材情報と商品特徴からプロンプトを構築する', () => {
    const result = buildDescriptionPrompt({
      woodNames: ['ウォールナット'],
      woodFeatures: ['濃い茶色で重厚感がある。硬くて耐久性に優れる。'],
      productCharacteristics: '丸いピアス',
    });

    expect(result.systemPrompt).toContain('ハンドメイド');
    expect(result.userPrompt).toContain('ウォールナット');
    expect(result.userPrompt).toContain('濃い茶色で重厚感がある');
    expect(result.userPrompt).toContain('丸いピアス');
    expect(result.userPrompt).not.toContain('参考にしたい文体');
  });

  it('複数の木材を含めてプロンプトを構築する', () => {
    const result = buildDescriptionPrompt({
      woodNames: ['ウォールナット', 'メープル'],
      woodFeatures: ['濃い茶色', '明るい色合い'],
      productCharacteristics: '三角形の指輪',
    });

    expect(result.userPrompt).toContain('ウォールナット: 濃い茶色');
    expect(result.userPrompt).toContain('メープル: 明るい色合い');
    expect(result.userPrompt).toContain('三角形の指輪');
  });

  it('参考例が指定された場合はプロンプトに含める', () => {
    const result = buildDescriptionPrompt({
      woodNames: ['チェリー'],
      woodFeatures: ['淡いピンク色'],
      productCharacteristics: 'ネックレス',
      referenceExample: '天然木の温もりを感じる一品です。',
    });

    expect(result.userPrompt).toContain('参考にしたい文体');
    expect(result.userPrompt).toContain('天然木の温もりを感じる一品です。');
  });

  it('参考例が空文字の場合は含めない', () => {
    const result = buildDescriptionPrompt({
      woodNames: ['チェリー'],
      woodFeatures: ['淡いピンク色'],
      productCharacteristics: 'ネックレス',
      referenceExample: '  ',
    });

    expect(result.userPrompt).not.toContain('参考にしたい文体');
  });
});
