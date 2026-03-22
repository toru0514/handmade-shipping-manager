export type ShippingLabelJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ShippingLabelJob {
  readonly id: string;
  readonly orderId: string;
  readonly shippingMethod: string;
  readonly status: ShippingLabelJobStatus;
  readonly result?: Record<string, unknown>;
  readonly error?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly completedAt?: Date;
}

export interface ShippingLabelJobRepository {
  enqueue(input: { orderId: string; shippingMethod: string }): Promise<ShippingLabelJob>;
  findById(id: string): Promise<ShippingLabelJob | null>;
  findPendingJobs(limit?: number): Promise<ShippingLabelJob[]>;
  markAsProcessing(id: string): Promise<boolean>;
  markAsCompleted(id: string, result: Record<string, unknown>): Promise<void>;
  markAsFailed(id: string, error: string): Promise<void>;
}
