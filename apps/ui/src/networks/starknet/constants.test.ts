import { describe, expect, it } from 'vitest';
import { createConstants } from './constants';

describe('Starknet Constants', () => {
  const constants = createConstants('sn', 'eth', 1);
  const input = `0x04ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d:1,0x395ed61716b48dc904140b515e9f682e33330154:2,0x395ed61716b48dc904140b515e9f682e33330154:3,
      0x395ed61716b48dc904140b515e9f682e33330154:4

      0x04ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d:5,
,
  `;

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
        it('should return the encoded value of the whitelist tree root', () => {
          const summary = strategy.generateParams!({
            whitelist: input
          });

          expect(summary).toEqual([
            '0x4d1cfb0a286a8f340bf7a0108359a796c5763cf540b55bcc1d049d0ef8f18e8'
          ]);
        });
      });
    });
  });
});
