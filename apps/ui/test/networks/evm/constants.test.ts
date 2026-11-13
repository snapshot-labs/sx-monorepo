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
    expect(constants.EDITOR_PROPOSAL_VALIDATIONS).toHaveLength(2);
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
  });
});
