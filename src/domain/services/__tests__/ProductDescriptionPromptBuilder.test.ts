import { describe, expect, it } from 'vitest';
import {
  applyTemplate,
  buildPolishPrompt,
  buildFreeGenerationPrompt,
} from '../ProductDescriptionPromptBuilder';

describe('applyTemplate', () => {
  it('プレースホルダーを置換する', () => {
    const template = '{木材名}の温もりを感じる{商品の特徴}です。{木材の特徴}を活かしました。';
    const result = applyTemplate(template, {
      woodNames: ['ウォールナット'],
      woodFeatures: ['濃い茶色で重厚感がある'],
      productCharacteristics: '丸いピアス',
    });

    expect(result).toBe(
      'ウォールナットの温もりを感じる丸いピアスです。ウォールナット: 濃い茶色で重厚感があるを活かしました。',
    );
  });

  it('複数の木材を含めて置換する', () => {
    const template = '{木材名}を使用。';
    const result = applyTemplate(template, {
      woodNames: ['ウォールナット', 'メープル'],
      woodFeatures: ['濃い茶色', '明るい色合い'],
      productCharacteristics: '指輪',
    });

    expect(result).toBe('ウォールナット、メープルを使用。');
  });

  it('プレースホルダーがない場合はそのまま返す', () => {
    const template = 'プレースホルダーなしの文章です。';
    const result = applyTemplate(template, {
      woodNames: ['チェリー'],
      woodFeatures: ['淡いピンク色'],
      productCharacteristics: 'ネックレス',
    });

    expect(result).toBe('プレースホルダーなしの文章です。');
  });
});

describe('buildPolishPrompt', () => {
  it('校正用プロンプトを構築する', () => {
    const result = buildPolishPrompt('ウォールナットの丸いピアスです。');

    expect(result.systemPrompt).toContain('校正');
    expect(result.userPrompt).toContain('ウォールナットの丸いピアスです。');
  });
});

describe('buildFreeGenerationPrompt', () => {
  it('自由生成プロンプトを構築する', () => {
    const result = buildFreeGenerationPrompt({
      woodNames: ['ウォールナット'],
      woodFeatures: ['濃い茶色で重厚感がある'],
      productCharacteristics: '丸いピアス',
    });

    expect(result.systemPrompt).toContain('ハンドメイド');
    expect(result.userPrompt).toContain('ウォールナット');
    expect(result.userPrompt).toContain('丸いピアス');
  });
});
