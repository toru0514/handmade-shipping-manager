import { getLogger } from '@/infrastructure/lib/logger';

const log = getLogger('minne-categories');

export type MinneCategoryNode = { id: string; label: string; children?: MinneCategoryNode[] };

export const MINNE_CATEGORY_TREE: MinneCategoryNode[] = [
  {
    id: '1',
    label: 'アクセサリー・ジュエリー',
    children: [
      { id: '277', label: 'ピアス（片耳用）' },
      { id: '2', label: 'ピアス（両耳用）' },
      { id: '3', label: 'イヤリング' },
      { id: '4', label: 'ネックレス・ペンダント' },
      { id: '5', label: 'ブレスレット' },
      { id: '6', label: 'アンクレット' },
      { id: '7', label: 'リング' },
      { id: '8', label: 'ヘアアクセサリー' },
      { id: '278', label: 'イヤーカフ' },
      { id: '9', label: 'コサージュ・ブローチ' },
      { id: '10', label: 'チャーム' },
      { id: '11', label: 'バッグチャーム・キーホルダー' },
      { id: '308', label: 'ボディピアス・軟骨ピアス' },
      { id: '12', label: '腕時計' },
      { id: '13', label: 'メガネ・サングラス' },
      { id: '14', label: 'ネクタイ・タイピン・カフス' },
      { id: '15', label: 'メンズアクセサリー' },
      { id: '16', label: 'ベビー・キッズアクセサリー' },
      { id: '17', label: 'ハンドメイドキット' },
      { id: '18', label: 'アクセサリーのその他' },
      { id: '315', label: 'イヤーラップ・イヤーフック' },
      { id: '323', label: 'イヤークリップ' },
    ],
  },
  {
    id: '10',
    label: 'ファッション',
    children: [
      { id: '100', label: 'トップス' },
      { id: '101', label: 'ワンピース' },
      { id: '102', label: 'スカート' },
      { id: '103', label: 'パンツ' },
      { id: '104', label: 'セットアップ' },
      { id: '105', label: 'アウター・ジャケット' },
      { id: '106', label: 'パーカー・スウェット' },
      { id: '107', label: 'ニット・セーター' },
      { id: '312', label: 'ベスト・ジレ' },
      { id: '108', label: 'シューズ・靴' },
      { id: '109', label: '帽子' },
      { id: '110', label: 'マフラー・ストール' },
      { id: '111', label: '手袋・アームウォーマー' },
      { id: '112', label: 'ソックス・靴下' },
      { id: '113', label: 'ウェディング' },
      { id: '114', label: '和装・和服' },
      { id: '115', label: 'メンズファッション' },
      { id: '116', label: 'その他のファッション' },
      { id: '326', label: 'オールインワン・サロペット' },
      { id: '327', label: '水着・浴衣' },
      { id: '328', label: 'タイツ・レギンス' },
    ],
  },
  {
    id: '21',
    label: 'バッグ・財布・小物',
    children: [
      { id: '200', label: 'トートバッグ' },
      { id: '201', label: 'ショルダーバッグ・斜めがけバッグ' },
      { id: '202', label: 'リュック・バックパック' },
      { id: '310', label: 'スマホショルダー' },
      { id: '203', label: 'クラッチバッグ・セカンドバッグ' },
      { id: '204', label: 'ポーチ・巾着' },
      { id: '205', label: 'ボストン・旅行用バッグ' },
      { id: '314', label: 'サコッシュ・ボディバッグ' },
      { id: '206', label: 'かごバッグ' },
      { id: '207', label: 'エコバッグ・サブバッグ' },
      { id: '208', label: '財布' },
      { id: '209', label: 'コインケース・小銭入れ' },
      { id: '210', label: 'パスケース・IDケース' },
      { id: '211', label: 'キーケース・キーカバー' },
      { id: '212', label: '名刺入れ・カードケース' },
      { id: '213', label: 'メガネケース・ペンケース' },
      { id: '214', label: 'がま口' },
      { id: '215', label: 'ベルト・サスペンダー' },
      { id: '216', label: 'メンズバッグ・財布・小物' },
      { id: '217', label: 'バッグ・財布・小物のその他' },
      { id: '311', label: '化粧ポーチ・ミニポーチ' },
      { id: '313', label: 'マスクケース・マスクポーチ' },
      { id: '324', label: '保冷バッグ・ランチバッグ' },
      { id: '330', label: 'PC・タブレットケース' },
      { id: '331', label: 'カメラ・ビデオカメラケース' },
    ],
  },
  {
    id: '27',
    label: '家具・生活雑貨',
    children: [
      { id: '270', label: 'テーブル・机' },
      { id: '271', label: '椅子・チェア' },
      { id: '272', label: 'ソファ・ベンチ' },
      { id: '273', label: '収納家具' },
      { id: '274', label: '本棚・マガジンラック' },
      { id: '275', label: 'その他の家具' },
      { id: '280', label: '照明・ランプ' },
      { id: '281', label: '時計（壁掛け・置き）' },
      { id: '282', label: 'インテリア雑貨' },
      { id: '283', label: 'クッション・クッションカバー' },
      { id: '284', label: 'ファブリック・タペストリー' },
      { id: '285', label: 'カーテン・ブラインド' },
      { id: '286', label: 'ラグ・マット・カーペット' },
      { id: '287', label: 'ミラー・鏡' },
      { id: '288', label: 'フォトフレーム・額縁' },
      { id: '289', label: 'サンキャッチャー・モビール' },
      { id: '290', label: 'ウェルカムボード・表札' },
      { id: '291', label: 'タオル・ハンカチ' },
      { id: '292', label: 'バス・トイレ用品' },
      { id: '293', label: '洗濯・掃除用品' },
      { id: '294', label: 'ルームシューズ・スリッパ' },
      { id: '295', label: '傘・レイングッズ' },
      { id: '296', label: '防災グッズ' },
      { id: '297', label: 'その他の家具・生活雑貨' },
      { id: '316', label: 'オーナメント・置物' },
      { id: '317', label: 'ガーランド・リース' },
      { id: '318', label: 'アートパネル・ファブリックパネル' },
      { id: '319', label: '一輪挿し・花瓶・花器' },
      { id: '320', label: 'ボックス・ケース' },
      { id: '321', label: 'カレンダー' },
      { id: '329', label: 'スマホスタンド・タブレットスタンド' },
    ],
  },
  {
    id: '58',
    label: 'ベビー・キッズ',
    children: [
      { id: '580', label: 'ベビー服' },
      { id: '581', label: 'キッズ服' },
      { id: '582', label: 'スタイ・よだれかけ' },
      { id: '583', label: 'おくるみ・ブランケット' },
      { id: '584', label: 'ベビー・キッズ用帽子' },
      { id: '585', label: 'ベビー・キッズ用靴・靴下' },
      { id: '586', label: 'ベビー・キッズ用バッグ' },
      { id: '587', label: '入園・入学・通園・通学グッズ' },
      { id: '588', label: '母子手帳・お薬手帳ケース' },
      { id: '589', label: '命名書・手形・足形' },
      { id: '590', label: 'ガラガラ・にぎにぎ' },
      { id: '591', label: '食事グッズ' },
      { id: '592', label: '抱っこ・おんぶ紐' },
      { id: '593', label: 'ベビーカー用品' },
      { id: '594', label: 'チャイルドシート用品' },
      { id: '595', label: 'ベビー・キッズのその他' },
    ],
  },
  {
    id: '74',
    label: 'ペットグッズ',
    children: [
      { id: '740', label: '犬用グッズ' },
      { id: '741', label: '猫用グッズ' },
      { id: '742', label: 'その他のペットグッズ' },
    ],
  },
  {
    id: '84',
    label: 'フラワー・ガーデン',
    children: [
      { id: '840', label: 'ドライフラワー' },
      { id: '841', label: 'プリザーブドフラワー' },
      { id: '842', label: 'アーティフィシャルフラワー' },
      { id: '843', label: '生花・切り花' },
      { id: '844', label: '花束・アレンジメント' },
      { id: '845', label: 'リース・スワッグ' },
      { id: '846', label: 'ハーバリウム' },
      { id: '847', label: '押し花' },
      { id: '848', label: '観葉植物・多肉植物' },
      { id: '849', label: 'ガーデニング用品' },
      { id: '850', label: 'フラワー・ガーデンのその他' },
    ],
  },
  {
    id: '163',
    label: 'スマホケース・モバイルグッズ',
    children: [
      { id: '630', label: 'iPhone（ハードケース）' },
      { id: '631', label: 'iPhone（手帳型）' },
      { id: '632', label: 'iPhone（ソフトケース）' },
      { id: '633', label: 'Androidスマホ（ハードケース）' },
      { id: '634', label: 'Androidスマホ（手帳型）' },
      { id: '635', label: 'Androidスマホ（ソフトケース）' },
      { id: '636', label: 'スマホケース用デコパーツ' },
      { id: '637', label: 'タブレットケース' },
      { id: '638', label: 'スマホリング・グリップ' },
      { id: '639', label: 'スマホ・タブレットのその他' },
      { id: '322', label: 'AirPods・ワイヤレスイヤホンケース' },
      { id: '325', label: 'iPhone（クリア・透明）' },
    ],
  },
  {
    id: '50',
    label: 'アート',
    children: [
      { id: '500', label: '絵画・油彩' },
      { id: '501', label: '絵画・水彩' },
      { id: '502', label: '絵画・アクリル' },
      { id: '503', label: '絵画・パステル' },
      { id: '504', label: '絵画・ペン画' },
      { id: '505', label: '日本画・墨絵' },
      { id: '506', label: 'デジタルアート・イラスト' },
      { id: '507', label: '版画・シルクスクリーン' },
      { id: '508', label: '切り絵・貼り絵' },
      { id: '509', label: '書道・カリグラフィー' },
      { id: '510', label: '写真' },
      { id: '511', label: '立体アート・オブジェ' },
      { id: '512', label: '似顔絵・肖像画' },
      { id: '513', label: 'グラフィックデザイン' },
      { id: '514', label: 'アートのその他' },
    ],
  },
  {
    id: '269',
    label: '食器・キッチン',
    children: [
      { id: '690', label: '皿・プレート' },
      { id: '691', label: 'ボウル・鉢' },
      { id: '692', label: '茶碗・めし碗' },
      { id: '693', label: 'お椀・汁椀' },
      { id: '694', label: 'マグカップ・ティーカップ' },
      { id: '695', label: 'グラス・コップ・タンブラー' },
      { id: '696', label: '酒器・徳利・片口' },
      { id: '697', label: '湯呑み' },
      { id: '698', label: '急須・ポット・ピッチャー' },
      { id: '699', label: '箸・スプーン・カトラリー' },
      { id: '700', label: '箸置き・カトラリーレスト' },
      { id: '701', label: 'コースター・マット' },
      { id: '702', label: 'お弁当箱・弁当袋' },
      { id: '703', label: '調理器具・料理道具' },
      { id: '704', label: 'エプロン・キッチンファブリック' },
      { id: '705', label: 'コーヒー・紅茶グッズ' },
      { id: '706', label: '食器・キッチンのその他' },
    ],
  },
  {
    id: '79',
    label: 'アロマ・キャンドル',
    children: [
      { id: '790', label: 'キャンドル' },
      { id: '791', label: 'キャンドルホルダー' },
      { id: '792', label: 'アロマディフューザー' },
      { id: '793', label: 'お香・インセンス' },
      { id: '794', label: 'サシェ・香り袋' },
      { id: '795', label: 'ソープ・石鹸' },
      { id: '796', label: 'バスボム・入浴剤' },
      { id: '797', label: 'アロマ・キャンドルのその他' },
    ],
  },
  {
    id: '32',
    label: '文房具・ステーショナリー',
    children: [
      { id: '320', label: 'カード・レターセット' },
      { id: '332', label: '封筒・ラッピング用品' },
      { id: '333', label: 'ノート・メモ帳' },
      { id: '334', label: 'シール・ステッカー' },
      { id: '335', label: 'マスキングテープ' },
      { id: '336', label: 'スタンプ・はんこ' },
      { id: '337', label: 'ペン・筆記用具' },
      { id: '338', label: 'ブックカバー・しおり' },
      { id: '339', label: 'ファイル・バインダー' },
      { id: '340', label: 'デスク用品' },
      { id: '341', label: '文房具・ステーショナリーのその他' },
    ],
  },
  {
    id: '64',
    label: 'ぬいぐるみ・人形',
    children: [
      { id: '640', label: 'ぬいぐるみ' },
      { id: '641', label: 'あみぐるみ' },
      { id: '642', label: '羊毛フェルト' },
      { id: '643', label: 'ドール・人形' },
      { id: '644', label: 'ぬいぐるみ服' },
      { id: '645', label: 'ドール服' },
      { id: '646', label: 'ぬいぐるみ・人形のその他' },
    ],
  },
  {
    id: '69',
    label: 'おもちゃ',
    children: [
      { id: '750', label: '積み木・ブロック' },
      { id: '751', label: 'ままごと・ごっこ遊び' },
      { id: '752', label: '木のおもちゃ' },
      { id: '753', label: '布のおもちゃ' },
      { id: '754', label: '知育玩具' },
      { id: '755', label: '乗り物のおもちゃ' },
      { id: '756', label: 'パズル・ゲーム' },
      { id: '757', label: '楽器のおもちゃ' },
      { id: '758', label: 'おもちゃのその他' },
    ],
  },
  {
    id: '39',
    label: 'ニット・編み物',
    children: [
      { id: '390', label: 'ニット帽・ベレー帽' },
      { id: '391', label: 'スヌード・マフラー' },
      { id: '392', label: '手袋・アームウォーマー' },
      { id: '393', label: 'セーター・カーディガン' },
      { id: '394', label: 'ベスト' },
      { id: '395', label: 'あったか小物' },
      { id: '396', label: 'ニット・編み物のその他' },
    ],
  },
  { id: '232', label: 'マスク', children: [{ id: '232', label: '布マスク・立体マスク' }] },
  {
    id: '327',
    label: 'レシピ・型紙・レッスン動画',
    children: [
      { id: '960', label: 'レシピ・作り方' },
      { id: '961', label: '型紙・パターン' },
      { id: '962', label: 'レッスン動画・オンラインレッスン' },
    ],
  },
  {
    id: '99',
    label: '素材・道具',
    children: [
      { id: '990', label: '生地・布' },
      { id: '991', label: '糸・紐' },
      { id: '992', label: 'ビーズ・パーツ' },
      { id: '993', label: '金具・チェーン' },
      { id: '994', label: '天然石・宝石' },
      { id: '995', label: 'レザー・革' },
      { id: '996', label: '木材・木工材料' },
      { id: '997', label: '陶芸・粘土材料' },
      { id: '998', label: '道具・工具' },
      { id: '999', label: '素材・道具のその他' },
    ],
  },
  {
    id: '189',
    label: '手作りキット',
    children: [
      { id: '890', label: 'アクセサリーキット' },
      { id: '891', label: '刺繍キット' },
      { id: '892', label: '編み物キット' },
      { id: '893', label: 'ソーイングキット' },
      { id: '894', label: 'レジンキット' },
      { id: '895', label: 'キャンドル・アロマキット' },
      { id: '896', label: 'その他の手作りキット' },
    ],
  },
];

// Alias map for lookups
type AliasTarget<T> = T | T[];
type AliasMap<T> = Map<string, AliasTarget<T>>;

const PARENT_BY_ID = new Map<string, MinneCategoryNode>();
const CHILD_BY_ID = new Map<string, Map<string, MinneCategoryNode>>();

const PARENT_ALIAS_MAP = buildAliasMap(MINNE_CATEGORY_TREE);
const CHILD_ALIAS_MAP = new Map<string, AliasMap<MinneCategoryNode>>();

for (const parent of MINNE_CATEGORY_TREE) {
  PARENT_BY_ID.set(parent.id, parent);
  if (!parent.children?.length) continue;

  const childById = new Map<string, MinneCategoryNode>();
  for (const child of parent.children) {
    childById.set(child.id, child);
  }

  CHILD_BY_ID.set(parent.id, childById);
  CHILD_ALIAS_MAP.set(parent.id, buildAliasMap(parent.children));
}

export function isValidMinneParentCategoryId(value: string | null | undefined): boolean {
  if (!value) return false;
  return PARENT_BY_ID.has(value.trim());
}

export function isValidMinneChildCategoryId(
  parentId: string | null | undefined,
  childId: string | null | undefined,
): boolean {
  if (!parentId || !childId) return false;
  const map = CHILD_BY_ID.get(parentId.trim());
  return map ? map.has(childId.trim()) : false;
}

/**
 * ラベルから大カテゴリIDを取得
 */
export function resolveMinneParentIdByLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  const found = findAliasMatch(PARENT_ALIAS_MAP, label);
  return found?.id ?? null;
}

/**
 * ラベルから小カテゴリIDを取得
 */
export function resolveMinneChildIdByLabel(
  parentLabel: string | null | undefined,
  childLabel: string | null | undefined,
): string | null {
  if (!parentLabel || !childLabel) return null;

  const parent = findAliasMatch(PARENT_ALIAS_MAP, parentLabel);
  if (!parent) return null;

  const childMap = CHILD_ALIAS_MAP.get(parent.id);
  if (!childMap) return null;

  const child = findAliasMatch(childMap, childLabel);
  return child?.id ?? null;
}

/**
 * 大カテゴリIDからラベルを取得
 */
export function getMinneParentLabelById(id: string | null | undefined): string | null {
  if (!id) return null;
  const found = PARENT_BY_ID.get(id.trim());
  return found?.label ?? null;
}

/**
 * 小カテゴリIDからラベルを取得
 */
export function getMinneChildLabelById(
  parentId: string | null | undefined,
  childId: string | null | undefined,
): string | null {
  if (!parentId || !childId) return null;
  const childMap = CHILD_BY_ID.get(parentId.trim());
  if (!childMap) return null;
  const found = childMap.get(childId.trim());
  return found?.label ?? null;
}

function buildAliasMap<T extends { label: string }>(nodes: T[]): AliasMap<T> {
  const map: AliasMap<T> = new Map();

  for (const node of nodes) {
    const candidates = expandAliasCandidates(node.label);
    for (const candidate of candidates) {
      registerAlias(map, candidate, node);
    }
  }

  return map;
}

function expandAliasCandidates(label: string): string[] {
  const trimmed = label.trim();
  if (!trimmed) return [];

  const base = new Set<string>();
  base.add(trimmed);
  base.add(trimmed.replace(/[\s\u3000]/g, ''));

  const pieces = trimmed
    .split(/[・／/＆&＋+,、\s\u3000（）()\-＞>→]+/)
    .map((piece) => piece.trim())
    .filter(Boolean);

  for (const piece of pieces) {
    base.add(piece);
    base.add(piece.replace(/[\s\u3000]/g, ''));
  }

  if (pieces.length > 1) {
    base.add(pieces.join(''));
  }

  return Array.from(base);
}

function registerAlias<T>(map: AliasMap<T>, alias: string, target: T): void {
  const normalized = normalizeCategoryToken(alias);
  if (!normalized) return;

  const current = map.get(normalized);
  if (!current) {
    map.set(normalized, target);
    return;
  }

  if (Array.isArray(current)) {
    if (!current.includes(target)) {
      current.push(target);
    }
  } else if (current !== target) {
    map.set(normalized, [current, target]);
  }
}

function findAliasMatch<T extends { label: string }>(map: AliasMap<T>, raw: string): T | null {
  const normalized = normalizeCategoryToken(raw);
  if (!normalized) return null;

  const hit = map.get(normalized);
  if (!hit) return null;
  if (Array.isArray(hit)) {
    log.warn('カテゴリアイテムが複数候補に一致しました', {
      input: raw,
      candidates: hit.map((entry) => entry.label),
    });
    return null;
  }
  return hit;
}

function normalizeCategoryToken(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u3000]/g, '')
    .replace(/[・／/＆&＋+,、。．:;…\-＞>→_|（）()[\]{}【】「」『』〈〉《》]/g, '');
}
