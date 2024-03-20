import { describe, it, expect } from 'vitest';

import { getNetwork } from '../index';
const network = getNetwork('s-tn');

describe('offchain network', () => {
  describe('getVotingPower', () => {
    describe('when using the only-member strategy', () => {
      const voter = '0x0000000000000000000000000000000000000000';

      it('returns a single voting power with 1n as value when member is in the list', async () => {
        await expect(
          network.actions.getVotingPower(
            'space.eth',
            ['only-members'],
            [{ addresses: [voter] }],
            [],
            voter,
            {
              at: null
            }
          )
        ).resolves.toEqual([
          {
            address: 'only-members',
            value: 1n,
            decimals: 18,
            symbol: '',
            token: '',
            chainId: undefined,
            swapLink: undefined
          }
        ]);
      });

      it('returns a single voting power with 0n as value when member is not in the list', async () => {
        await expect(
          network.actions.getVotingPower(
            'space.eth',
            ['only-members'],
            [{ addresses: [voter] }],
            [],
            '0x0000000000000000000000000000000000000001',
            {
              at: null
            }
          )
        ).resolves.toEqual([
          {
            address: 'only-members',
            value: 0n,
            decimals: 18,
            symbol: '',
            token: '',
            chainId: undefined,
            swapLink: undefined
          }
        ]);
      });
    });
  });
});
