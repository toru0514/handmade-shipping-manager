export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`対象注文が見つかりません: ${orderId}`);
    this.name = 'OrderNotFoundError';
  }
}

export class InvalidShipmentInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidShipmentInputError';
  }
}

export class InvalidShipmentOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidShipmentOperationError';
  }
}
