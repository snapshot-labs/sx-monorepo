import { describe, it, expect } from 'vitest';
import { createConstants } from './constants';

describe('EVM Constants', () => {
  const constants = createConstants('eth');
  const input = `0x395ed61716b48dc904140b515e9f682e33330154:1,0x395ed61716b48dc904140b515e9f682e33330154:2,0x395ed61716b48dc904140b515e9f682e33330154:3,
      0x395ed61716b48dc904140b515e9f682e33330154:4

  0x395ed61716b48dc904140b515e9f682e33330154:5,
,
  `;

  describe('EDITOR_VOTING_STRATEGIES', () => {
    describe('whitelist', () => {
      const strategy = constants.EDITOR_VOTING_STRATEGIES.find(s => s.name === 'Whitelist')!;

      describe('generateSummary', () => {
        it('should return the correct number of addresses', () => {
          const summary = strategy.generateSummary!({
            whitelist: input
          });

          expect(summary).toEqual('(5 addresses)');
        });
      });

      describe('generateParams', () => {
        it('should return the encoded value of the whitelist tree root', () => {
          const summary = strategy.generateParams!({
            whitelist: input
          });

          expect(summary).toMatchSnapshot();
        });
      });
    });
  });
});
