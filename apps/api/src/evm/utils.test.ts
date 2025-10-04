import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { describe, expect, it } from 'vitest';
import { PartialConfig } from './types';
import {
  applyConfig,
  applyProtocolPrefixToWriters,
  getTimestampFromBlock
} from './utils';

describe('applyProtocolPrefixToWriters', () => {
  it('should apply prefix to writer keys', () => {
    const writers = { createProposal: async () => {}, vote: async () => {} };

    const result = applyProtocolPrefixToWriters('snapshotX', writers);

    expect(Object.keys(result)).toEqual([
      'snapshotX_createProposal',
      'snapshotX_vote'
    ]);
  });
});

describe('applyConfig', () => {
  const mockEvent = { name: 'TestEvent', fn: 'handleTest' };

  it('should merge and prefix sources', () => {
    const target: PartialConfig = {
      sources: [
        {
          start: 0,
          contract: '0x0',
          events: [{ name: 'Existing', fn: 'handleExisting' }]
        }
      ],
      templates: {
        Existing: { events: [{ name: 'Existing', fn: 'handleExisting' }] }
      },
      abis: {}
    };

    const config = {
      sources: [{ start: 0, contract: '0x0', events: [mockEvent] }],
      templates: { NewTemplate: { events: [mockEvent] } },
      abis: { TestAbi: [] }
    };

    const result = applyConfig(target, 'snapshotX', config);

    expect(result).toEqual({
      abis: {
        TestAbi: []
      },
      sources: [
        {
          start: 0,
          contract: '0x0',
          events: [
            {
              fn: 'handleExisting',
              name: 'Existing'
            }
          ]
        },
        {
          start: 0,
          contract: '0x0',
          events: [
            {
              fn: 'snapshotX_handleTest',
              name: 'TestEvent'
            }
          ]
        }
      ],
      templates: {
        Existing: {
          events: [
            {
              fn: 'handleExisting',
              name: 'Existing'
            }
          ]
        },
        NewTemplate: {
          events: [
            {
              fn: 'snapshotX_handleTest',
              name: 'TestEvent'
            }
          ]
        }
      }
    });
  });
});

describe('getTimestampFromBlock', () => {
  it('should return timestamp for networks with own block.number', async () => {
    const provider = new StaticJsonRpcProvider('https://rpc.snapshot.org/1');

    const actual = await getTimestampFromBlock({
      networkId: 'eth',
      blockNumber: 22294892,
      currentBlockNumber: 22287746,
      currentTimestamp: 1744881215,
      provider
    });

    expect(actual).toBe(1744967610);
  });

  it('should return timestamp for networks with foreign block.number', async () => {
    const provider = new StaticJsonRpcProvider(
      'https://rpc.snapshot.org/42161'
    );

    const actual = await getTimestampFromBlock({
      networkId: 'arb1',
      blockNumber: 22997779,
      currentBlockNumber: 361494473,
      currentTimestamp: 1753466114,
      provider
    });

    expect(actual).toBe(1753466114);
  });
});
