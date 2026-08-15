import { describe, expect, it } from 'vitest';
import { getDelegationReadChainId } from './delegation';

describe('getDelegationReadChainId', () => {
  it('prefers the delegationNetwork param over the strategy network', () => {
    expect(
      getDelegationReadChainId(
        { network: '1', params: { delegationNetwork: '100' } },
        '1'
      )
    ).toBe('100');
  });

  it('returns a string when delegationNetwork is numeric', () => {
    expect(
      getDelegationReadChainId(
        { network: '1', params: { delegationNetwork: 100 } },
        '1'
      )
    ).toBe('100');
  });

  it('falls back to the strategy network', () => {
    expect(getDelegationReadChainId({ network: '137', params: {} }, '1')).toBe(
      '137'
    );
  });

  it('falls back to the given chain when the strategy has no network', () => {
    expect(getDelegationReadChainId({ params: {} }, '1')).toBe('1');
    expect(getDelegationReadChainId({}, '1')).toBe('1');
    expect(getDelegationReadChainId({ network: '' }, '1')).toBe('1');
  });
});
