export interface ShippingMethodLabelResolver {
  resolve(methodCode: string): Promise<string>;
}
