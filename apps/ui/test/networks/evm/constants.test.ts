import { AbiCoder } from '@ethersproject/abi';
import { describe, expect, it } from 'vitest';
import { createConstants } from '@/networks/evm/constants';

describe('EVM Constants', () => {
  const pin = async () => ({ provider: 'dummy', cid: '1' });
  const constants = createConstants('eth', { pin });
  const input = `0x395ed61716b48dc904140b515e9f682e33330154:1,0x395ed61716b48dc904140b515e9f682e33330154:2,0x395ed61716b48dc904140b515e9f682e33330154:3,
      0x395ed61716b48dc904140b515e9f682e33330154:4

  0x395ed61716b48dc904140b515e9f682e33330154:5,
,
  `;

  it('should include all editor entries for standard networks', () => {
    expect(constants.EDITOR_AUTHENTICATORS).toHaveLength(3);
    expect(constants.EDITOR_VOTING_STRATEGIES).toHaveLength(4);
    expect(constants.EDITOR_PROPOSAL_VALIDATIONS).toHaveLength(3);
    expect(constants.EDITOR_EXECUTION_STRATEGIES).toHaveLength(2);
  });

  describe('EDITOR_VOTING_STRATEGIES', () => {
    describe('whitelist', () => {
      const strategy = constants.EDITOR_VOTING_STRATEGIES.find(
        s => s.name === 'Whitelist'
      )!;

      describe('generateSummary', () => {
        it('should return the correct number of addresses', () => {
          const summary = strategy.generateSummary!({
            whitelist: input
          });

          expect(summary).toEqual('(5 addresses)');
        });
      });

      describe('generateParams', () => {
        it('should return the encoded value of the whitelist tree root', async () => {
          const summary = await strategy.generateParams!({
            whitelist: input
          });

          expect(summary).toEqual([
            '0x107aeb9f6cd74046422dc4138dd222efb6f0790d9e4e5e541fb00320e3866d49'
          ]);
        });
      });
    });
  });

  describe('EDITOR_PROPOSAL_VALIDATIONS', () => {
    describe('voting power with cooldown', () => {
      const strategy = constants.EDITOR_PROPOSAL_VALIDATIONS.find(
        s => s.type === 'VotingPowerWithCooldown'
      )!;
      const VANILLA_STRATEGY = '0xC1245C5DCa7885C73E32294140F1e5d30688c202';
      const params = {
        threshold: '100',
        maxActiveProposals: 5,
        cooldown: 604800
      };

      it('should encode params in contract order', async () => {
        const [encoded] = await strategy.generateParams!({
          ...params,
          strategies: [{ address: VANILLA_STRATEGY }]
        });

        expect(encoded).toBe(
          new AbiCoder().encode(
            ['uint256', 'uint256', 'uint256', 'tuple(address, bytes)[]'],
            [604800, 5, 100, [[VANILLA_STRATEGY, '0x00']]]
          )
        );
        expect(await strategy.parseParams!(encoded)).toEqual(params);
      });

      it('should summarize threshold, limit and cooldown', () => {
        expect(strategy.generateSummary!(params)).toBe(
          '(100, max. 5, 7d cooldown)'
        );
      });
    });

    describe('voting power at a recent block', () => {
      const VANILLA_STRATEGY = '0xC1245C5DCa7885C73E32294140F1e5d30688c202';
      // Threshold and strategies, then maxActiveProposals, cooldown and maxBlockAge packed in a uint96
      const V2_PARAMS = ['uint256', 'tuple(address, bytes)[]', 'uint96'];
      const getStrategy = (networkId: 'eth' | 'base' | 'oeth') =>
        createConstants(networkId, { pin }).EDITOR_PROPOSAL_VALIDATIONS.find(
          s => s.type === 'VotingPowerV2'
        );

      it('should only be offered where the contract is deployed', () => {
        expect(getStrategy('eth')).toBeDefined();
        expect(getStrategy('base')).toBeDefined();
        expect(getStrategy('oeth')).toBeUndefined();
      });

      it.each([
        ['eth', 300],
        ['base', 1800]
      ] as const)(
        'should default %s to 1 hour of blocks (%i) and accept 0 for the current block only',
        (networkId, hour) => {
          const strategy = getStrategy(networkId)!;

          expect(strategy.defaultParams).toEqual({
            cooldown: 0,
            maxActiveProposals: 1,
            maxBlockAge: hour
          });
          expect(
            strategy.paramsDefinition?.properties.maxBlockAge?.minimum
          ).toBe(0);
        }
      );

      it.each([
        [{ maxActiveProposals: 1, cooldown: 0, maxBlockAge: 256 }],
        [{ maxActiveProposals: 5, cooldown: 604800, maxBlockAge: 0 }],
        [
          {
            maxActiveProposals: 2 ** 32 - 1,
            cooldown: 2 ** 32 - 1,
            maxBlockAge: 2 ** 32 - 1
          }
        ]
      ])('should pack the limits in contract order: %o', async limits => {
        const strategy = getStrategy('eth')!;
        const params = { threshold: '100', ...limits };
        const [encoded] = await strategy.generateParams!({
          ...params,
          strategies: [{ address: VANILLA_STRATEGY }]
        });

        expect(encoded).toBe(
          new AbiCoder().encode(V2_PARAMS, [
            100,
            [[VANILLA_STRATEGY, '0x00']],
            (BigInt(limits.maxActiveProposals) << 64n) |
              (BigInt(limits.cooldown) << 32n) |
              BigInt(limits.maxBlockAge)
          ])
        );
        expect(await strategy.parseParams!(encoded)).toEqual(params);
      });

      it.each([2 ** 32, -1, 1.5])(
        'should refuse a limit that does not fit in 32 bits: %d',
        async value => {
          await expect(
            getStrategy('eth')!.generateParams!({
              threshold: '1',
              maxActiveProposals: 1,
              cooldown: value,
              maxBlockAge: 0,
              strategies: [{ address: VANILLA_STRATEGY }]
            })
          ).rejects.toThrow("doesn't fit in 32 bits");
        }
      );

      it('should only mention the cooldown when there is one', () => {
        const strategy = getStrategy('eth')!;

        expect(
          strategy.generateSummary!({ threshold: '100', cooldown: 0 })
        ).toBe('(100)');
        expect(
          strategy.generateSummary!({
            threshold: '100',
            maxActiveProposals: 5,
            cooldown: 604800
          })
        ).toBe('(100, max. 5, 7d cooldown)');
      });
    });
  });
});
