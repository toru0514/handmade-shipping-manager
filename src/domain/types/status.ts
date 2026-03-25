export type ProductStatus =
  | 'new'
  | 'ready'
  | 'queued'
  | 'processing'
  | 'drafted'
  | 'error'
  | 'skipped';

export type JobStatus = 'queued' | 'processing' | 'success' | 'error' | 'skipped';
