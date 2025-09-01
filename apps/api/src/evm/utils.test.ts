import { describe, expect, it } from 'vitest';
import { PartialConfig } from './types';
import { applyConfig, applyProtocolPrefixToWriters } from './utils';

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
