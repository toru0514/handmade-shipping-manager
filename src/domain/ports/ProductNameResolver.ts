export interface ProductNameResolver {
  resolve(originalProductName: string): Promise<string>;
}

/**
 * 何もしないデフォルト実装（引数をそのまま返す）
 */
export class IdentityProductNameResolver implements ProductNameResolver {
  async resolve(name: string): Promise<string> {
    return name;
  }
}

/**
 * オプション部分（末尾の括弧）を除去してベース商品名を返す。
 * 例: "ウッドイヤーカフ_エボニー(三角M(金箔))" → "ウッドイヤーカフ_エボニー"
 */
export function stripOptionSuffix(name: string): string {
  return name.replace(/(\s*[（(][^)）]*[)）])+\s*$/, '').trim();
}

/**
 * 複数の商品名を一括解決してキャッシュマップを返す。
 * API呼び出し回数を最小化するため、ユニーク名のみ解決する。
 */
export async function resolveAllProductNames(
  resolver: ProductNameResolver,
  names: Iterable<string>,
): Promise<Map<string, string>> {
  const uniqueNames = new Set(names);
  const cache = new Map<string, string>();
  await Promise.all(
    Array.from(uniqueNames).map(async (name) => {
      const resolved = await resolver.resolve(name);
      cache.set(name, resolved);
    }),
  );
  return cache;
}
