/**
 * Buyer — 購入者（名前、住所、電話番号を含む複合値オブジェクト）
 */
import { Address } from './Address';
import { BuyerName } from './BuyerName';
import { PhoneNumber } from './PhoneNumber';

export class Buyer {
  readonly name: BuyerName;
  readonly address: Address;
  readonly phoneNumber?: PhoneNumber;

  constructor(params: { name: BuyerName; address: Address; phoneNumber?: PhoneNumber }) {
    this.name = params.name;
    this.address = params.address;
    this.phoneNumber = params.phoneNumber;
  }

  equals(other: Buyer): boolean {
    const phoneEquals =
      this.phoneNumber === undefined && other.phoneNumber === undefined
        ? true
        : this.phoneNumber !== undefined &&
          other.phoneNumber !== undefined &&
          this.phoneNumber.equals(other.phoneNumber);

    return this.name.equals(other.name) && this.address.equals(other.address) && phoneEquals;
  }
}
