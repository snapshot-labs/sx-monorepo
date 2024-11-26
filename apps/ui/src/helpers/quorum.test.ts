import { describe, expect, it } from 'vitest';
import { formatQuorum } from './quorum';

describe('formatQuorum', () => {
  it('should format using 3 significant digits', () => {
    expect(formatQuorum(0.001)).toBe('0.1%');
    expect(formatQuorum(0.1234)).toBe('12.3%');
    expect(formatQuorum(0.555667)).toBe('55.5%');
    expect(formatQuorum(4.446326)).toBe('444%');
    expect(formatQuorum(999.90111)).toBe('99.9k%');
  });

  it('should not round up but truncate', () => {
    expect(formatQuorum(0.9999)).toBe('99.9%');
  });

  it('should format big numbers in compact format', () => {
    expect(formatQuorum(1000)).toBe('100k%');
    expect(formatQuorum(1234)).toBe('123k%');
    expect(formatQuorum(5556)).toBe('555k%');
    expect(formatQuorum(44444)).toBe('4.44m%');
  });
});
