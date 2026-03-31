import { describe, expect, it } from 'vitest';
import {
  applyTemplate,
  buildPolishPrompt,
  DEFAULT_TEMPLATE,
} from '../ProductDescriptionPromptBuilder';

describe('applyTemplate', () => {
  it('プレースホルダーを置換する', () => {
    const template = '{木材名}の温もりを感じる{商品の特徴}です。';
    const result = applyTemplate(template, {
      woodNames: ['ウォールナット'],
      woodFeatures: ['濃い茶色で重厚感がある'],
      productCharacteristics: '丸いピアス',
    });

    expect(result).toBe('ウォールナットの温もりを感じる丸いピアスです。');
  });

  it('複数の木材を「・」区切りで置換する', () => {
    const template = '{木材名}を使用。';
    const result = applyTemplate(template, {
      woodNames: ['ウォールナット', 'メープル'],
      woodFeatures: ['濃い茶色', '明るい色合い'],
      productCharacteristics: '指輪',
    });

    expect(result).toBe('ウォールナット・メープルを使用。');
  });

  it('{木材の特徴}を置換する', () => {
    const template = '■ 素材の魅力\n{木材の特徴}';
    const result = applyTemplate(template, {
      woodNames: ['カリン'],
      woodFeatures: ['赤みがかった落ち着いた色味と、艶やかで硬質な手触り。'],
      productCharacteristics: 'リング',
    });

    expect(result).toContain('赤みがかった落ち着いた色味');
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

describe('DEFAULT_TEMPLATE', () => {
  it('プレースホルダーが含まれている', () => {
    expect(DEFAULT_TEMPLATE).toContain('{木材名}');
    expect(DEFAULT_TEMPLATE).toContain('{木材の特徴}');
    expect(DEFAULT_TEMPLATE).toContain('{商品の特徴}');
  });
});
