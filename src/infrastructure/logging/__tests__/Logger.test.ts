import { describe, it, expect, vi } from 'vitest';
import { ConsoleLogger } from '../Logger';

describe('ConsoleLogger', () => {
  it('warn() は console.warn を呼ぶ', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = new ConsoleLogger();
    logger.warn('test message', { key: 'value' });
    expect(spy).toHaveBeenCalledWith('[DualWrite]', 'test message', { key: 'value' });
    spy.mockRestore();
  });

  it('error() は console.error を呼ぶ', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new ConsoleLogger();
    logger.error('error message', { key: 'value' });
    expect(spy).toHaveBeenCalledWith('[DualWrite]', 'error message', { key: 'value' });
    spy.mockRestore();
  });
});
