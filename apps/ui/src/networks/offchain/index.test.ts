import * as sx from '@snapshot-labs/sx';
import { describe, expect, it, vi } from 'vitest';
import { getNetwork } from '../index';

const network = getNetwork('s');
const voter = '0xf1f09AdC06aAB740AA16004D62Dbd89484d3Be90';

describe('offchain network', () => {
  describe('getVotingPower', () => {
    describe('vote validation', () => {
      it.each([['invalid address', 'invalid-address']])(
        'returns a single VotingPower object with 0 (%s)',
        async (label, invalidVoter) => {
          await expect(
            network.actions.getVotingPower(
              'space.eth',
              ['ticket', 'math', 'api'],
              [
                { network: 100, decimals: 9, address: 'TOKEN', symbol: 'SYM' },
                {}
              ],
              [],
              invalidVoter,
              {
                at: null
              }
            )
          ).resolves.toEqual([
            {
              address: 'ticket',
              cumulativeDecimals: 0,
              displayDecimals: 0,
              symbol: '',
              token: null,
              value: 0n
            }
          ]);
        }
      );
    });

    it('returns a VotingPower for each strategy', async () => {
      expect.assertions(2);

      const result = [
        BigInt(Math.floor(1 * 10 ** 9)),
        BigInt(Math.floor(2 * 10 ** 18)),
        BigInt(Math.floor(3 * 10 ** 18))
      ];

      const getOffchainStrategyFn = vi
        .spyOn(sx, 'getOffchainStrategy')
        .mockReturnValueOnce({
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
              params: {
                network: 100,
                decimals: 9,
                address: 'TOKEN',
                symbol: 'SYM'
              }
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
          cumulativeDecimals: 9,
          displayDecimals: 9,
          symbol: 'SYM',
          token: 'TOKEN',
          value: result[0],
          chainId: undefined,
          swapLink: undefined
        },
        {
          address: 'math',
          cumulativeDecimals: 18,
          displayDecimals: 18,
          symbol: undefined,
          token: undefined,
          value: result[1],
          chainId: 5,
          swapLink: undefined
        },
        {
          address: 'api',
          cumulativeDecimals: 18,
          displayDecimals: 18,
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
      it.each([['invalid address', 'invalid-address']])(
        'returns a single VotingPower object with 0 (%s)',
        async (label, invalidVoter) => {
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
              cumulativeDecimals: 0,
              displayDecimals: 0,
              symbol: '',
              token: null,
              value: 0n
            }
          ]);
        }
      );

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
              cumulativeDecimals: 0,
              displayDecimals: 0,
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
              cumulativeDecimals: 0,
              displayDecimals: 0,
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
