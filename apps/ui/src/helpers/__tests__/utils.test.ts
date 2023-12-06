import { describe, it, expect } from 'vitest';

import { createErc1155Metadata } from '../utils';

describe('utils', () => {
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
        walletNetwork: 'gor',
        walletAddress: '0x000000000000000000000000000000000000dead',
        delegations: [
          {
            name: 'sample',
            apiType: 'governor-subgraph',
            apiUrl: 'https://thegraph.com/hosted-service/subgraph/arr00/uniswap-governance-v2',
            contractNetwork: 'gor',
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
          wallets: ['gor:0x000000000000000000000000000000000000dead'],
          delegations: [
            {
              name: 'sample',
              api_type: 'governor-subgraph',
              api_url: 'https://thegraph.com/hosted-service/subgraph/arr00/uniswap-governance-v2',
              contract: 'gor:0x000000000000000000000000000000000000dead'
            }
          ]
        }
      });
    });
  });
});
