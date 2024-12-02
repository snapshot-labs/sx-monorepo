import { describe, expect, it } from 'vitest';
import {
  _d,
  _vp,
  createErc1155Metadata,
  formatAddress,
  getStampUrl,
  uniqBy
} from './utils';

describe('utils', () => {
  describe('uniqBy', () => {
    it('should return unique values by key', () => {
      const arr = [
        { id: 1, value: 'a' },
        { id: 2, value: 'b' },
        { id: 3, value: 'a' }
      ];

      const result = uniqBy(arr, 'value');
      expect(result).toEqual([
        { id: 1, value: 'a' },
        { id: 2, value: 'b' }
      ]);
    });

    it('should return unique values by predicate function', () => {
      const arr = [2.1, 1.2, 2.3];

      const result = uniqBy(arr, Math.floor);
      expect(result).toEqual([2.1, 1.2]);
    });
  });

  describe('_vp', () => {
    it('should format dust', () => {
      expect(_vp(0.001)).toBe('~0');
    });

    it('should use 3 max decimals for small numbers', () => {
      expect(_vp(0.1234)).toBe('0.123');
      expect(_vp(55.5667)).toBe('55.567');
      expect(_vp(444.6326)).toBe('444.633');
      expect(_vp(999.90111)).toBe('999.901');
    });

    it('should use 1 max decimal for big numbers', () => {
      expect(_vp(1000)).toBe('1k');
      expect(_vp(1234)).toBe('1.2k');
      expect(_vp(5556)).toBe('5.6k');
      expect(_vp(44444)).toBe('44.4k');
      expect(_vp(999900)).toBe('999.9k');
    });
  });

  describe('createErc1155Metadata', () => {
    it('should create metadata', () => {
      const metadata = createErc1155Metadata({
        name: 'Test',
        avatar: '',
        cover: '',
        description: 'Test description',
        externalUrl: 'https://test.com',
        github: 'snapshot-labs',
        twitter: 'SnapshotLabs',
        discord: 'snapshot',
        votingPowerSymbol: 'VOTE',
        treasuries: [
          {
            name: 'treasury 1',
            chainId: 11155111,
            address: '0x000000000000000000000000000000000000dead'
          }
        ],
        labels: [
          {
            id: 'test',
            name: 'Test',
            description: 'Test description',
            color: '#000000'
          }
        ],
        delegations: [
          {
            name: 'sample',
            apiType: 'governor-subgraph',
            apiUrl:
              'https://thegraph.com/hosted-service/subgraph/arr00/uniswap-governance-v2',
            chainId: 11155111,
            contractAddress: '0x000000000000000000000000000000000000dead'
          }
        ]
      });

      expect(metadata).toEqual({
        name: 'Test',
        avatar: '',
        description: 'Test description',
        external_url: 'https://test.com',
        properties: {
          voting_power_symbol: 'VOTE',
          cover: '',
          github: 'snapshot-labs',
          twitter: 'SnapshotLabs',
          discord: 'snapshot',
          treasuries: [
            {
              name: 'treasury 1',
              chain_id: 11155111,
              address: '0x000000000000000000000000000000000000dead'
            }
          ],
          labels: [
            {
              id: 'test',
              name: 'Test',
              description: 'Test description',
              color: '#000000'
            }
          ],
          delegations: [
            {
              name: 'sample',
              api_type: 'governor-subgraph',
              api_url:
                'https://thegraph.com/hosted-service/subgraph/arr00/uniswap-governance-v2',
              contract: '0x000000000000000000000000000000000000dead',
              chain_id: 11155111
            }
          ]
        }
      });
    });
  });

  describe('_d', () => {
    it('formats full duration correctly', () => {
      expect(_d(90061)).toBe('1d 1h 1m 1s');
    });

    it('omits zero values', () => {
      expect(_d(86400)).toBe('1d');
      expect(_d(3600)).toBe('1h');
      expect(_d(60)).toBe('1m');
      expect(_d(1)).toBe('1s');
    });

    it('handles large values', () => {
      expect(_d(3666661)).toBe('42d 10h 31m 1s');
    });

    it('handles very large values', () => {
      expect(_d(60 * 60 * 24 * 1001)).toBe('1001d');
    });

    it('returns empty string for zero', () => {
      expect(_d(0)).toBe('');
    });

    it('handles edge cases', () => {
      expect(_d(86399)).toBe('23h 59m 59s');
      expect(_d(86400)).toBe('1d');
      expect(_d(86401)).toBe('1d 1s');
    });
  });

  describe('formatAddress', () => {
    it('returns a checksummed evm address', () => {
      expect(formatAddress('0x556b14cbda79a36dc33fcd461a04a5bcb5dc2a70')).toBe(
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'
      );
    });

    it('returns a padded starknet address', () => {
      expect(formatAddress('0x4c5dda09742520fdf5c2bbfa4aede8fb9fe6781')).toBe(
        '0x00000000000000000000000004c5dda09742520fdf5c2bbfa4aede8fb9fe6781'
      );
    });

    it('returns the input if it is not a valid address', () => {
      expect(formatAddress('ens.eth')).toBe('ens.eth');
      expect(formatAddress('')).toBe('');
    });
  });

  describe('getStampUrl', () => {
    it('returns a stamp url with a formatted ID', () => {
      expect(
        getStampUrl('avatar', '0x556b14cbda79a36dc33fcd461a04a5bcb5dc2a70', 32)
      ).toBe(
        'https://cdn.stamp.fyi/avatar/0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70?s=64'
      );

      expect(
        getStampUrl('avatar', '0x4c5dda09742520fdf5c2bbfa4aede8fb9fe6781', 32)
      ).toBe(
        'https://cdn.stamp.fyi/avatar/0x00000000000000000000000004c5dda09742520fdf5c2bbfa4aede8fb9fe6781?s=64'
      );

      expect(getStampUrl('space', 'ens.eth', 32)).toBe(
        'https://cdn.stamp.fyi/space/ens.eth?s=64'
      );
    });

    it('returns a stamp with x2 size when given a single number', () => {
      expect(
        getStampUrl('space', '0x000000000000000000000000000000000000dead', 32)
      ).toBe(
        'https://cdn.stamp.fyi/space/0x000000000000000000000000000000000000dEaD?s=64'
      );
    });

    it('returns a stamp url with the given width and height', () => {
      expect(
        getStampUrl('space', '0x000000000000000000000000000000000000dEaD', {
          width: 1,
          height: 2
        })
      ).toBe(
        'https://cdn.stamp.fyi/space/0x000000000000000000000000000000000000dEaD?w=1&h=2'
      );
    });

    it('returns a stamp url with the given hash if available', () => {
      expect(
        getStampUrl(
          'space',
          '0x000000000000000000000000000000000000dead',
          32,
          '1234'
        )
      ).toBe(
        'https://cdn.stamp.fyi/space/0x000000000000000000000000000000000000dEaD?s=64&cb=1234'
      );
    });
  });
});
