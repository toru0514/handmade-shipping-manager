export type CreemaCategoryNode = { id: string; label: string; children?: CreemaCategoryNode[] };

export const CREEMA_CATEGORY_TREE: CreemaCategoryNode[] = [
  {
    id: '2',
    label: 'アクセサリー・ジュエリー',
    children: [
      { id: '216', label: 'ピアス' },
      { id: '74', label: 'イヤリング・ノンホールピアス' },
      { id: '63', label: 'ネックレス・ペンダント' },
      { id: '65', label: 'ブレスレット・バングル' },
      { id: '76', label: '指輪・リング' },
      { id: '217', label: 'ヘアアクセサリー' },
      { id: '77', label: 'コサージュ' },
      { id: '61', label: 'ブローチ' },
      { id: '477', label: 'ピンバッチ' },
      { id: '189', label: 'イヤーカフ・イヤーフック' },
      { id: '107', label: 'アンクレット' },
      { id: '106', label: '腕時計' },
      { id: '218', label: 'ネックストラップ' },
      { id: '219', label: '手鏡' },
      { id: '158', label: 'ネイルチップ・ネイルシール' },
      { id: '59', label: 'その他アクセサリー' },
    ],
  },
  {
    id: '8',
    label: 'ファッション',
    children: [
      { id: '225', label: 'Tシャツ・カットソー' },
      { id: '131', label: 'シャツ・ブラウス' },
      { id: '82', label: 'ワンピース・チュニック' },
      { id: '29', label: 'スカート' },
      { id: '228', label: 'パンツ' },
      { id: '454', label: 'マスク' },
      { id: '142', label: 'コート・ジャケット' },
      { id: '226', label: 'パーカー・スウェット' },
      { id: '141', label: 'ニット・セーター' },
      { id: '28', label: 'カーディガン・ボレロ' },
      { id: '482', label: 'ベスト' },
      { id: '483', label: 'タンクトップ・キャミソール' },
      { id: '227', label: 'その他トップス' },
      { id: '484', label: 'オールインワン・サロペット' },
      { id: '485', label: 'セットアップ' },
      { id: '83', label: 'シューズ・靴' },
      { id: '229', label: 'マフラー・ストール' },
      { id: '31', label: '帽子' },
      { id: '230', label: '靴下・タイツ' },
      { id: '126', label: '手袋・ミトン' },
      { id: '231', label: '小物・ファッション雑貨' },
      { id: '140', label: '和装・和小物' },
      { id: '66', label: 'その他ファッション' },
    ],
  },
  {
    id: '9',
    label: 'バッグ・カバン',
    children: [
      { id: '41', label: 'トートバッグ' },
      { id: '6', label: 'ショルダーバッグ' },
      { id: '122', label: 'リュック・バックパック' },
      { id: '486', label: 'サコッシュ' },
      { id: '578', label: 'スマホショルダー' },
      { id: '191', label: 'ポシェット' },
      { id: '487', label: 'ボディバッグ・ウエストポーチ' },
      { id: '120', label: 'エコバッグ・サブバッグ' },
      { id: '115', label: 'クラッチバッグ' },
      { id: '146', label: 'かごバッグ' },
      { id: '488', label: '巾着バッグ' },
      { id: '20', label: 'ハンドバッグ' },
      { id: '489', label: 'バケツバッグ' },
      { id: '118', label: 'ボストンバッグ' },
      { id: '490', label: 'メッセンジャーバッグ' },
      { id: '491', label: 'ビジネスバッグ' },
      { id: '127', label: 'グラニーバッグ' },
      { id: '492', label: '2wayバッグ' },
      { id: '574', label: 'ランドセル' },
      { id: '220', label: 'その他バッグ' },
    ],
  },
  {
    id: '213',
    label: '財布・ケース・小物入れ',
    children: [
      { id: '221', label: '長財布' },
      { id: '124', label: 'ミニ財布・コンパクト財布' },
      { id: '21', label: '小銭入れ・コインケース' },
      { id: '453', label: 'マスクケース' },
      { id: '497', label: 'メガネケース' },
      { id: '22', label: 'ポーチ' },
      { id: '188', label: 'がま口' },
      { id: '192', label: '巾着袋' },
      { id: '100', label: 'キーケース' },
      { id: '222', label: 'キーリング' },
      { id: '42', label: '名刺入れ・カードケース' },
      { id: '144', label: 'パスケース・定期入れ' },
      { id: '35', label: 'カメラケース・カメラポーチ' },
      { id: '331', label: 'アイコスケース（iQOS・電子タバコ）' },
      { id: '23', label: 'その他ケース' },
    ],
  },
  {
    id: '214',
    label: 'iPhoneケース・スマホ・PC',
    children: [
      { id: '44', label: 'iPhoneケース・カバー' },
      { id: '223', label: 'スマホケース・カバー' },
      { id: '330', label: 'モバイルバッテリー・充電器' },
      { id: '336', label: 'スマホスタンド・スマホスピーカー' },
      { id: '145', label: 'iPad・タブレットケース' },
      { id: '224', label: 'PCケース' },
    ],
  },
  {
    id: '15',
    label: '家具',
    children: [
      { id: '132', label: 'テーブル・机' },
      { id: '103', label: '椅子（チェアー）・スツール' },
      { id: '232', label: 'ソファ・ベンチ' },
      { id: '134', label: '本棚・絵本棚・マガジンラック' },
      { id: '197', label: '棚・シェルフ・ラック' },
      { id: '337', label: '靴箱・下駄箱・シューズラック' },
      { id: '338', label: '壁掛けラック・ウォールシェルフ' },
      { id: '339', label: 'ハンガーラック' },
      { id: '200', label: 'テレビ台・テレビボード' },
      { id: '233', label: 'ドレッサー・ミラー・鏡台' },
      { id: '234', label: 'チェスト・キャビネット' },
      { id: '340', label: 'パーテーション・間仕切り' },
      { id: '16', label: 'その他家具' },
    ],
  },
  {
    id: '215',
    label: 'インテリア雑貨・生活道具',
    children: [
      { id: '136', label: '掛け時計・置き時計' },
      { id: '87', label: '照明（ライト）・ランプ' },
      { id: '341', label: '壁掛けラック・ウォールシェルフ' },
      { id: '342', label: 'スマホスタンド・スマホスピーカー' },
      { id: '111', label: 'フォトフレーム・写真立て' },
      { id: '343', label: 'カレンダー' },
      { id: '108', label: 'サンキャッチャー' },
      { id: '344', label: '風鈴' },
      { id: '498', label: 'ウォールデコ' },
      { id: '113', label: 'ガーランド' },
      { id: '110', label: 'モビール' },
      { id: '105', label: 'クッション・クッションカバー' },
      { id: '19', label: 'キャンドル・キャンドルホルダー' },
      { id: '346', label: 'ディフューザー・アロマポット' },
      { id: '347', label: '蚊取り線香ホルダー・蚊遣り' },
      { id: '348', label: '表札・ネームプレート' },
      { id: '86', label: 'フラワー・リース' },
      { id: '104', label: '一輪挿し・花瓶・花器' },
      { id: '349', label: 'カーテン' },
      { id: '350', label: 'カーペット・絨毯・ラグ・マット' },
      { id: '351', label: 'スリッパ・ルームシューズ' },
      { id: '502', label: '靴ベラ' },
      { id: '352', label: '収納用品・掃除道具' },
      { id: '353', label: 'バス・トイレ・洗面用品' },
      { id: '354', label: 'スイッチカバー・コンセントカバー' },
      { id: '355', label: 'タオルハンガー・タオル掛け' },
      { id: '17', label: 'その他インテリア雑貨' },
    ],
  },
  {
    id: '1',
    label: 'アート',
    children: [
      { id: '3', label: '絵画' },
      { id: '4', label: '写真・グラフィック' },
      { id: '236', label: 'イラスト' },
      { id: '13', label: '版画' },
      { id: '237', label: 'ZINE・小冊子' },
      { id: '5', label: '切り絵' },
      { id: '67', label: '立体・オブジェ' },
      { id: '160', label: '書道' },
      { id: '238', label: '彫刻' },
      { id: '161', label: 'その他アート' },
    ],
  },
  {
    id: '14',
    label: '食器・キッチン',
    children: [
      { id: '239', label: '皿・プレート' },
      { id: '116', label: '茶碗・めし碗' },
      { id: '112', label: 'お椀・ボウル・鉢' },
      { id: '240', label: 'グラス・カップ・酒器' },
      { id: '121', label: 'ポット・急須' },
      { id: '241', label: '箸・カトラリー' },
      { id: '243', label: '調理器具・料理道具' },
      { id: '356', label: 'ドリップスタンド・コーヒードリッパー' },
      { id: '133', label: '調味料入れ・ラベル' },
      { id: '242', label: '配膳用品・キッチンファブリック' },
      { id: '357', label: 'キッチンペーパーホルダー' },
      { id: '358', label: '弁当箱・弁当袋' },
      { id: '128', label: 'エプロン' },
      { id: '18', label: 'その他キッチン小物' },
    ],
  },
  {
    id: '12',
    label: 'ぬいぐるみ・置物',
    children: [
      { id: '244', label: 'ぬいぐるみ' },
      { id: '43', label: '人形' },
      { id: '40', label: '羊毛フェルト' },
      { id: '45', label: 'あみぐるみ' },
      { id: '24', label: '置物' },
    ],
  },
  {
    id: '48',
    label: '雑貨・ステーショナリー',
    children: [
      { id: '245', label: 'カード・レター' },
      { id: '246', label: '文房具・ステーショナリー' },
      { id: '101', label: 'ブックカバー' },
      { id: '150', label: 'しおり・ブックマーク' },
      { id: '167', label: 'マグネット' },
      { id: '166', label: 'カレンダー' },
      { id: '510', label: 'マウスパッド' },
      { id: '153', label: '携帯アクセサリー・ストラップ' },
      { id: '52', label: 'はんこ・スタンプ' },
      { id: '154', label: '楽器・アクセサリ' },
      { id: '54', label: '音楽CD' },
      { id: '247', label: 'マスキングテープ' },
      { id: '248', label: 'シール・ステッカー' },
      { id: '249', label: 'ご祝儀袋・袱紗（ふくさ）' },
      { id: '511', label: 'ぽち袋・お年玉袋' },
      { id: '49', label: 'その他雑貨' },
    ],
  },
  {
    id: '11',
    label: 'ペットグッズ',
    children: [
      { id: '32', label: 'ペット服・アクセサリー' },
      { id: '33', label: 'リード・首輪' },
      { id: '34', label: 'おもちゃ・ペット小物' },
      { id: '512', label: 'クッション・ベッド' },
      { id: '513', label: 'ハウス・小屋' },
    ],
  },
  {
    id: '10',
    label: 'ベビー・キッズ',
    children: [
      { id: '37', label: '子供服' },
      { id: '36', label: 'ベビー服' },
      { id: '148', label: 'スタイ・よだれかけ' },
      { id: '461', label: 'マスク' },
      { id: '199', label: 'ロンパース' },
      { id: '163', label: '帽子' },
      { id: '162', label: '靴' },
      { id: '193', label: 'レッスンバッグ・入園グッズ' },
      { id: '575', label: '体操服袋・お着替え袋' },
      { id: '520', label: '給食袋' },
      { id: '521', label: '母子手帳ケース' },
      { id: '576', label: 'ランドセル' },
      { id: '577', label: 'ランドセルカバー' },
      { id: '168', label: '食器・家具' },
      { id: '169', label: 'スリング・抱っこひも' },
      { id: '38', label: 'おもちゃ・人形' },
      { id: '39', label: '雑貨・その他' },
    ],
  },
  {
    id: '53',
    label: 'ウェディング',
    children: [
      { id: '250', label: 'ドレス' },
      { id: '171', label: 'ヘッドドレス（ウェディング）' },
      { id: '170', label: 'リングピロー' },
      { id: '172', label: 'ブーケ' },
      { id: '56', label: 'ウェルカムボード' },
      { id: '522', label: 'ペーパーアイテム' },
      { id: '529', label: 'ケーキトッパー' },
      { id: '530', label: 'フォトプロップス' },
      { id: '57', label: 'その他オーダーメイド' },
    ],
  },
  {
    id: '69',
    label: 'メンズ',
    children: [
      { id: '30', label: 'ファッション（メンズ）' },
      { id: '58', label: 'アクセサリー（メンズ）' },
      { id: '70', label: 'バッグ・カバン（メンズ）' },
      { id: '251', label: '財布・ケース・小物入れ（メンズ）' },
      { id: '334', label: 'iPhoneケース・スマホ・PC（メンズ）' },
      { id: '335', label: '腕時計（メンズ）' },
      { id: '139', label: 'ネクタイ・蝶ネクタイ' },
      { id: '164', label: 'タイピン・カフス' },
    ],
  },
  {
    id: '173',
    label: 'ハンドメイド素材',
    children: [
      { id: '179', label: '生地' },
      { id: '252', label: 'はぎれ' },
      { id: '187', label: '木材・板' },
      { id: '180', label: 'ビーズ' },
      { id: '185', label: '天然石' },
      { id: '181', label: 'チャーム' },
      { id: '253', label: 'レジン・樹脂' },
      { id: '254', label: 'ビジュー・クリスタル' },
      { id: '255', label: 'とんぼ玉' },
      { id: '194', label: 'デコパーツ' },
      { id: '256', label: 'パール' },
      { id: '177', label: 'ボタン' },
      { id: '184', label: 'ワッペン・アップリケ' },
      { id: '186', label: 'リボン・テープ' },
      { id: '183', label: 'レース' },
      { id: '174', label: '毛糸' },
      { id: '178', label: '糸・ミシン糸' },
      { id: '257', label: 'ひも・コード' },
      { id: '182', label: '金具・チェーン' },
      { id: '196', label: 'ラッピング用品' },
      { id: '195', label: 'DIYパーツ' },
      { id: '258', label: '型紙' },
      { id: '176', label: '編み図・パターン' },
      { id: '175', label: 'キット' },
      { id: '47', label: 'その他素材' },
      { id: '201', label: 'フード・お酒・ドリンク' },
      { id: '543', label: 'スイーツ・お菓子・パン' },
      { id: '545', label: 'お惣菜・おかず' },
      { id: '553', label: 'チーズ・ヨーグルト・乳加工品' },
      { id: '554', label: '麺類' },
      { id: '209', label: 'コーヒー・紅茶・お茶' },
      { id: '559', label: 'ジュース' },
      { id: '202', label: 'ジャム・シロップ・はちみつ' },
      { id: '211', label: '調味料・スパイス' },
      { id: '467', label: '野菜' },
      { id: '468', label: '米・米粉・餅・穀類' },
      { id: '469', label: '果物（フルーツ）' },
      { id: '212', label: 'ギフトセット' },
      { id: '572', label: 'お酒' },
    ],
  },
];

type AliasTarget<T> = T | T[];
type AliasMap<T> = Map<string, AliasTarget<T>>;

type ResolveOptions = {
  level1Label?: string | null;
  level2Label?: string | null;
};

const CATEGORY_PATH_SPLIT_PATTERN = /[\\/／>＞→|]+/;

const LEVEL1_BY_ID = new Map<string, CreemaCategoryNode>();
const LEVEL2_BY_ID = new Map<string, Map<string, CreemaCategoryNode>>();

const LEVEL1_ALIAS_MAP = buildAliasMap(CREEMA_CATEGORY_TREE);
const LEVEL2_ALIAS_MAP = new Map<string, AliasMap<CreemaCategoryNode>>();

for (const level1 of CREEMA_CATEGORY_TREE) {
  LEVEL1_BY_ID.set(level1.id, level1);
  if (!level1.children?.length) continue;

  const childById = new Map<string, CreemaCategoryNode>();
  for (const child of level1.children) {
    childById.set(child.id, child);
  }

  LEVEL2_BY_ID.set(level1.id, childById);
  LEVEL2_ALIAS_MAP.set(level1.id, buildAliasMap(level1.children));
}

export function isValidCreemaLevel1CategoryId(value: string | null | undefined): boolean {
  if (!value) return false;
  return LEVEL1_BY_ID.has(value.trim());
}

export function isValidCreemaLevel2CategoryId(
  level1Id: string | null | undefined,
  level2Id: string | null | undefined,
): boolean {
  if (!level1Id || !level2Id) return false;
  const map = LEVEL2_BY_ID.get(level1Id.trim());
  return map ? map.has(level2Id.trim()) : false;
}

export function resolveCreemaCategoryPath(
  rawPath: string | null | undefined,
  options: ResolveOptions = {},
): { level1Id: string | null; level2Id: string | null; level3Label: string | null } {
  const tokens = (rawPath ?? '')
    .split(CATEGORY_PATH_SPLIT_PATTERN)
    .map((token) => sanitizeToken(token))
    .filter(Boolean);

  const primaryLevel1Label = options.level1Label ?? tokens[0] ?? null;
  const level1 = primaryLevel1Label ? findAliasMatch(LEVEL1_ALIAS_MAP, primaryLevel1Label) : null;

  if (!level1) {
    if (primaryLevel1Label) {
      console.warn('[creema-draft] 未知の第一階層カテゴリ', rawPath, primaryLevel1Label);
    }
    return { level1Id: null, level2Id: null, level3Label: null };
  }

  const level2Map = LEVEL2_ALIAS_MAP.get(level1.id);

  if (options.level2Label && !level2Map) {
    console.warn('[creema-draft] 第二階層カテゴリ定義が見つかりません', level1.label);
  }

  let level2: CreemaCategoryNode | null = null;
  const primaryLevel2Label = options.level2Label ?? tokens[1] ?? null;

  if (primaryLevel2Label && level2Map) {
    level2 = findAliasMatch(level2Map, primaryLevel2Label);
    if (!level2) {
      console.warn('[creema-draft] 未知の第二階層カテゴリ', rawPath, primaryLevel2Label);
    }
  }

  if (!level2 && level2Map && tokens.length > 1) {
    const fallbackToken = tokens[1];
    if (fallbackToken && fallbackToken !== primaryLevel2Label) {
      level2 = findAliasMatch(level2Map, fallbackToken);
      if (!level2) {
        console.warn('[creema-draft] 第二階層カテゴリ候補が見つかりません', rawPath, fallbackToken);
      }
    }
  }

  const level3Label = tokens[2] ?? null;

  return { level1Id: level1.id, level2Id: level2?.id ?? null, level3Label };
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
  base.add(trimmed.replace(/[\s　]/g, ''));

  const pieces = trimmed
    .split(/[・／/＆&＋+,、\s　（）()\-＞>→]+/)
    .map((piece) => piece.trim())
    .filter(Boolean);

  for (const piece of pieces) {
    base.add(piece);
    base.add(piece.replace(/[\s　]/g, ''));
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
    console.warn(
      '[creema-draft] カテゴリアイテムが複数候補に一致しました',
      raw,
      hit.map((entry) => entry.label),
    );
    return null;
  }
  return hit;
}

function normalizeCategoryToken(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　]/g, '')
    .replace(/[・／/＆&＋+,、。．:;…\-＞>→_|（）()\[\]{}【】「」『』〈〉《》]/g, '');
}

function sanitizeToken(value: string): string {
  return value.replace(/[\s　]+/g, ' ').trim();
}
