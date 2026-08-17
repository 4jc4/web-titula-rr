import { describe, expect, it } from 'vitest';
import { formatUptime } from './status-panel';

describe('formatUptime', () => {
  it('some a hora quando não passa de 1h', () => {
    expect(formatUptime(90)).toBe('1min');
    expect(formatUptime(59)).toBe('0min');
  });

  it('mostra horas e minutos a partir de 1h', () => {
    expect(formatUptime(3661)).toBe('1h 1min');
    expect(formatUptime(7200)).toBe('2h 0min');
  });
});
