import { constants } from 'starknet';
import { describe, expect, it, vi } from 'vitest';
import { getOrganizationConfigById } from '@/helpers/organizations';
import {
  aggregateVoters,
  assertTransactionSucceeded,
  getValidatorProfile,
  GOVERNANCE_SPACES,
  isSameAddress,
  isValidStarknetAddress,
  normalizeAddress,
  registryCalls,
  resolvePoolMember,
  sendRegistryCall,
  STAKED_DELEGATION_NETWORK
} from '@/helpers/stakedVoteDelegation';
import {
  pickRecentProposals,
  RECORD_SIZE
} from '@/helpers/stakedVoteDelegation/votingRecord';
import { Proposal } from '@/types';

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
    expect(
      registryCalls.setAcceptsDefaultDelegations(false, 'sn-sep').calldata
    ).toEqual(['0']);
    expect(
      registryCalls.setAcceptsDefaultDelegations(true, 'sn-sep').calldata
    ).toEqual(['1']);
  });
});

describe('pickRecentProposals', () => {
  const proposal = (id: string, created: number, state = 'closed') =>
    ({ id, created, state }) as unknown as Proposal;

  it('merges votes and polls, newest first, without pending ones', () => {
    const votes = [proposal('v1', 10), proposal('v2', 30, 'pending')];
    const polls = [proposal('p1', 20), proposal('p2', 5, 'active')];
    expect(pickRecentProposals(votes, polls).map(p => p.id)).toEqual([
      'p1',
      'v1',
      'p2'
    ]);
  });

  it(`keeps at most ${RECORD_SIZE}`, () => {
    const many = Array.from({ length: 10 }, (_, i) => proposal(`v${i}`, i));
    expect(pickRecentProposals(many, [])).toHaveLength(RECORD_SIZE);
  });
});

describe('aggregateVoters', () => {
  const STRK = 10n ** 18n;
  const pool = (
    staker: string,
    amount: number,
    config: { voteReceiver: string; acceptsDefaultDelegations: boolean }
  ) => ({
    validator: {
      staker,
      pool: '0x1',
      delegated: '0',
      own: '0',
      commission: null,
      exiting: false
    },
    amount: BigInt(amount) * STRK,
    config
  });
  const memberships = [
    pool(STAKER, 60, { voteReceiver: STAKER, acceptsDefaultDelegations: true }),
    pool('0x555', 30, {
      voteReceiver: RECEIVER,
      acceptsDefaultDelegations: true
    }),
    pool('0x666', 10, {
      voteReceiver: '0x666',
      acceptsDefaultDelegations: false
    })
  ];

  it('splits the default across validators, receivers and declines', () => {
    expect(aggregateVoters(MEMBER, memberships, null)).toEqual([
      { address: normalizeAddress(STAKER), amount: 60n * STRK, share: 0.6 },
      { address: normalizeAddress(RECEIVER), amount: 30n * STRK, share: 0.3 },
      { address: normalizeAddress(MEMBER), amount: 10n * STRK, share: 0.1 }
    ]);
  });

  it('sends everything to an explicit delegate', () => {
    expect(aggregateVoters(MEMBER, memberships, DELEGATEE)).toEqual([
      { address: normalizeAddress(DELEGATEE), amount: 100n * STRK, share: 1 }
    ]);
  });

  it('returns nothing without stake', () => {
    expect(aggregateVoters(MEMBER, [], null)).toEqual([]);
  });
});

describe('getValidatorProfile', () => {
  it('returns null for unknown or invalid addresses', () => {
    expect(getValidatorProfile('0x123')).toBeNull();
    expect(getValidatorProfile('not an address')).toBeNull();
  });
});

describe('assertTransactionSucceeded', () => {
  it('accepts a successful transaction', () => {
    expect(() =>
      assertTransactionSucceeded({ execution_status: 'SUCCEEDED' })
    ).not.toThrow();
  });

  it('turns a known registry revert into a clear message', () => {
    expect(() =>
      assertTransactionSucceeded({
        execution_status: 'REVERTED',
        revert_reason:
          "Error in the called contract (0x07c1...):\nExecution failed. Failure reason: 0x... ('SVD: no delegation set')."
      })
    ).toThrow('There was no choice to reset.');
  });

  it('reports any other revert as a failure', () => {
    expect(() =>
      assertTransactionSucceeded({
        execution_status: 'REVERTED',
        revert_reason: 'Out of gas'
      })
    ).toThrow('The transaction failed on-chain and nothing was changed.');
  });
});

describe('sendRegistryCall', () => {
  const CALL = registryCalls.resetDelegation('sn-sep');

  /** A wallet on `chainId` that ignores switch requests, like some do. */
  function createWallet(chainId: string | null) {
    const execute = vi.fn(async () => ({ transaction_hash: '0xabc' }));
    const request = vi.fn(async ({ type }: { type: string }) => {
      if (type === 'wallet_requestChainId') {
        if (chainId === null) throw new Error('not implemented');
        return chainId;
      }
      if (type === 'wallet_switchStarknetChain') return true;
      throw new Error(`unexpected request ${type}`);
    });
    return { web3: { provider: { request, account: { execute } } }, execute };
  }

  it('sends the call when the wallet is on the registry network', async () => {
    const { web3, execute } = createWallet(
      constants.StarknetChainId.SN_SEPOLIA
    );

    await expect(sendRegistryCall(web3, CALL, 'sn-sep')).resolves.toBe('0xabc');
    expect(execute).toHaveBeenCalledWith(CALL);
  });

  it('refuses to send when the wallet stays on another network', async () => {
    const { web3, execute } = createWallet(constants.StarknetChainId.SN_MAIN);

    await expect(sendRegistryCall(web3, CALL, 'sn-sep')).rejects.toThrow(
      'Switch your wallet to Starknet Sepolia and try again.'
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('sends the call when the wallet cannot report its network', async () => {
    const { web3, execute } = createWallet(null);

    await sendRegistryCall(web3, CALL, 'sn-sep');
    expect(execute).toHaveBeenCalled();
  });
});

describe('network', () => {
  it("follows the Starknet organization's spaces", () => {
    const { spaceIds } = getOrganizationConfigById('starknet')!;

    expect(
      GOVERNANCE_SPACES.map(({ network, id }) => ({ network, id }))
    ).toEqual(spaceIds);
    expect(STAKED_DELEGATION_NETWORK).toBe('sn');
  });
});
