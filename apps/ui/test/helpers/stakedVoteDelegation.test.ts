import { describe, expect, it } from 'vitest';
import {
  isSameAddress,
  isValidStarknetAddress,
  normalizeAddress,
  registryCalls,
  resolvePoolMember
} from '@/helpers/stakedVoteDelegation';

const MEMBER = '0x111';
const STAKER = '0x222';
const RECEIVER = '0x333';
const DELEGATEE = '0x444';

describe('resolvePoolMember', () => {
  it('uses the explicit delegate first, whatever the validator does', () => {
    expect(
      resolvePoolMember(MEMBER, STAKER, DELEGATEE, {
        voteReceiver: RECEIVER,
        acceptsDefaultDelegations: false
      })
    ).toEqual({ votesWith: DELEGATEE, reason: 'explicit' });
  });

  it('returns the member when the validator declined default delegations', () => {
    expect(
      resolvePoolMember(MEMBER, STAKER, null, {
        voteReceiver: RECEIVER,
        acceptsDefaultDelegations: false
      })
    ).toEqual({ votesWith: normalizeAddress(MEMBER), reason: 'declined' });
  });

  it('returns the validator by default', () => {
    expect(
      resolvePoolMember(MEMBER, STAKER, null, {
        voteReceiver: normalizeAddress(STAKER),
        acceptsDefaultDelegations: true
      })
    ).toEqual({ votesWith: normalizeAddress(STAKER), reason: 'validator' });
  });

  it("returns the validator's vote receiver when one is set", () => {
    expect(
      resolvePoolMember(MEMBER, STAKER, null, {
        voteReceiver: RECEIVER,
        acceptsDefaultDelegations: true
      })
    ).toEqual({ votesWith: RECEIVER, reason: 'vote-receiver' });
  });
});

describe('isValidStarknetAddress', () => {
  it('accepts felt addresses below 2**251', () => {
    expect(isValidStarknetAddress('0x1')).toBe(true);
    expect(
      isValidStarknetAddress(
        '0x07c1db3e8a9137063d364c84c2175d323ed75b1a7e4fd457cca81aa99ecec55f'
      )
    ).toBe(true);
  });

  it('rejects zero, non-hex and out-of-range values', () => {
    expect(isValidStarknetAddress('0x0')).toBe(false);
    expect(isValidStarknetAddress('hello')).toBe(false);
    expect(isValidStarknetAddress(`0x8${'0'.repeat(62)}`)).toBe(false);
  });
});

describe('isSameAddress', () => {
  it('ignores padding and case', () => {
    expect(isSameAddress('0x0ABC', '0xabc')).toBe(true);
    expect(isSameAddress('0xabc', '0xabd')).toBe(false);
    expect(isSameAddress(null, '0xabc')).toBe(false);
  });
});

describe('registryCalls', () => {
  it('encodes the boolean for set_accepts_default_delegations', () => {
    expect(registryCalls.setAcceptsDefaultDelegations(false).calldata).toEqual([
      '0'
    ]);
    expect(registryCalls.setAcceptsDefaultDelegations(true).calldata).toEqual([
      '1'
    ]);
  });
});
