export interface ProductNameResolver {
  resolve(originalProductName: string): Promise<string>;
}
