import { describe, it, expect } from 'vitest';

import { _vp, createErc1155Metadata } from './utils';

describe('utils', () => {
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
            network: 'sep',
            address: '0x000000000000000000000000000000000000dead'
          }
        ],
        delegations: [
          {
            name: 'sample',
            apiType: 'governor-subgraph',
            apiUrl: 'https://thegraph.com/hosted-service/subgraph/arr00/uniswap-governance-v2',
            contractNetwork: 'sep',
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
              network: 'sep',
              address: '0x000000000000000000000000000000000000dead'
            }
          ],
          delegations: [
            {
              name: 'sample',
              api_type: 'governor-subgraph',
              api_url: 'https://thegraph.com/hosted-service/subgraph/arr00/uniswap-governance-v2',
              contract: 'sep:0x000000000000000000000000000000000000dead'
            }
          ]
        }
      });
    });
  });
});
