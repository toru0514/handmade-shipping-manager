export interface PurchaseThanksProductNameResolver {
  resolve(originalProductName: string): Promise<string>;
}
