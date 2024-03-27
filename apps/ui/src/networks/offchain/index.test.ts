import { vi, describe, it, expect } from 'vitest';
import * as sx from '@snapshot-labs/sx';
import { getNetwork } from '../index';

const network = getNetwork('s-tn');
const voter = '0xf1f09AdC06aAB740AA16004D62Dbd89484d3Be90';

describe('offchain network', () => {
  describe('getVotingPower', () => {
    describe('vote validation', () => {
      it.each([
        ['invalid address', 'invalid-address'],
        ['starknet address', '0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918']
      ])('returns a single VotingPower object with 0 (%s)', async (label, invalidVoter) => {
        await expect(
          network.actions.getVotingPower(
            'space.eth',
            ['ticket', 'math', 'api'],
            [{ network: 100, decimals: 9, address: 'TOKEN', symbol: 'SYM' }, {}],
            [],
            invalidVoter,
            {
              at: null
            }
          )
        ).resolves.toEqual([
          {
            address: 'ticket',
            decimals: 0,
            symbol: '',
            token: null,
            value: 0n
          }
        ]);
      });
    });

    it('returns a VotingPower for each strategy', async () => {
      expect.assertions(2);

      const result = [
        BigInt(Math.floor(1 * 10 ** 9)),
        BigInt(Math.floor(2 * 10 ** 18)),
        BigInt(Math.floor(3 * 10 ** 18))
      ];

      const getOffchainStrategyFn = vi.spyOn(sx, 'getOffchainStrategy').mockReturnValueOnce({
        type: 'remote-vp',
        getVotingPower: async () => {
          return result;
        }
      });

      await expect(
        network.actions.getVotingPower(
          'space.eth',
          ['ticket', 'math', 'api'],
          [
            {
              name: 'ticket',
              params: { network: 100, decimals: 9, address: 'TOKEN', symbol: 'SYM' }
            },
            { name: 'math', params: {}, network: 5 },
            { name: 'api', params: {} }
          ],
          [],
          voter,
          {
            at: null
          }
        )
      ).resolves.toEqual([
        {
          address: 'ticket',
          decimals: 9,
          symbol: 'SYM',
          token: 'TOKEN',
          value: result[0],
          chainId: undefined,
          swapLink: undefined
        },
        {
          address: 'math',
          decimals: 18,
          symbol: undefined,
          token: undefined,
          value: result[1],
          chainId: 5,
          swapLink: undefined
        },
        {
          address: 'api',
          decimals: 18,
          symbol: undefined,
          token: undefined,
          value: result[2],
          chainId: undefined,
          swapLink: undefined
        }
      ]);
      expect(getOffchainStrategyFn).toHaveBeenCalledOnce();
    });

    describe('proposal validation', () => {
      it.each([
        ['invalid address', 'invalid-address'],
        ['starknet address', '0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918']
      ])('returns a single VotingPower object with 0 (%s)', async (label, invalidVoter) => {
        await expect(
          network.actions.getVotingPower(
            'space.eth',
            ['basic', 'passport-gated'],
            [{}, {}],
            [],
            invalidVoter,
            {
              at: null
            }
          )
        ).resolves.toEqual([
          {
            address: 'basic',
            decimals: 0,
            symbol: '',
            token: null,
            value: 0n
          }
        ]);
      });

      describe('when using the only-member strategy', () => {
        it('returns a single VotingPower with 1n when member is in the list', async () => {
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
              decimals: 0,
              symbol: '',
              token: '',
              chainId: undefined
            }
          ]);
        });

        it('returns a single VotingPower with 0n when member is not in the list', async () => {
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
              decimals: 0,
              symbol: '',
              token: '',
              chainId: undefined
            }
          ]);
        });
      });
    });
  });
});
