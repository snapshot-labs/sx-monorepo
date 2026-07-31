import { describe, expect, it } from 'vitest';
import {
  createEvmConfig,
  createStandardConfig,
  evmNetworks
} from '../../src/evmNetworks';

describe('createStandardConfig', () => {
  it('should return standard addresses by default', () => {
    const config = createStandardConfig(1, { blockTime: 12 });

    expect(config).toEqual({
      Meta: {
        eip712ChainId: 1,
        maxPriorityFeePerGas: undefined,
        blockTime: 12,
        hasNonNativeBlockNumbers: undefined,
        proxyFactory: '0x4B4F7f64Be813Ccc66AEFC3bFCe2baA01188631c',
        masterSpace: '0xC3031A7d3326E47D49BfF9D374d74f364B29CE4D'
      },
      Authenticators: {
        EthSig: '0x5f9B7D78c9a37a439D78f801E0E339C6E711e260',
        EthSigV2: '0x95CF9B585fDb12DeB78002B5643dFF8fe67a496D',
        EthTx: '0xBA06E6cCb877C332181A6867c05c8b746A21Aed1'
      },
      Strategies: {
        Vanilla: '0xC1245C5DCa7885C73E32294140F1e5d30688c202',
        Comp: '0x0c2De612982Efd102803161fc7C74CcA15Db932c',
        OZVotes: '0x2c8631584474E750CEdF2Fb6A904f2e84777Aefe',
        Whitelist: '0x34f0AfFF5A739bBf3E285615F50e40ddAaf2A829',
        ApeGas: undefined
      },
      ProposalValidations: {
        VotingPower: '0x6D9d6D08EF6b26348Bd18F1FC8D953696b7cf311'
      },
      ExecutionStrategies: {
        SimpleQuorumAvatar: '0xecE4f6b01a2d7FF5A9765cA44162D453fC455e42',
        SimpleQuorumTimelock: '0xf2A1C2f2098161af98b2Cc7E382AB7F3ba86Ebc4'
      }
    });
  });

  it('should apply overrides and disable nulled slots', () => {
    const config = createStandardConfig(84532, {
      blockTime: 2,
      proxyFactory: '0xfDe801CFc7f9a931eB1CF026e60B08a366B13494',
      masterSpace: '0x3F31D742D3158b07434A041e26B47e9EB94e010C',
      authenticators: {
        EthSig: '0x69A9c5626860f53f9b4fD5F2936d74eC93417677',
        EthSigV2: null
      },
      strategies: {
        Vanilla: '0xc501B2057E60CfD31559e4FD1e3134aF0BA9C673',
        Comp: null,
        OZVotes: null,
        Whitelist: null
      },
      proposalValidations: {
        VotingPower: null
      },
      executionStrategies: {
        SimpleQuorumAvatar: null,
        SimpleQuorumTimelock: null
      }
    });

    expect(config.Meta.proxyFactory).toBe(
      '0xfDe801CFc7f9a931eB1CF026e60B08a366B13494'
    );
    expect(config.Meta.masterSpace).toBe(
      '0x3F31D742D3158b07434A041e26B47e9EB94e010C'
    );
    expect(config.Authenticators.EthSig).toBe(
      '0x69A9c5626860f53f9b4fD5F2936d74eC93417677'
    );
    expect(config.Authenticators.EthSigV2).toBeUndefined();
    expect(config.Authenticators.EthTx).toBe(
      '0xBA06E6cCb877C332181A6867c05c8b746A21Aed1'
    );
    expect(config.Strategies.Vanilla).toBe(
      '0xc501B2057E60CfD31559e4FD1e3134aF0BA9C673'
    );
    expect(config.Strategies.Comp).toBeUndefined();
    expect(config.Strategies.OZVotes).toBeUndefined();
    expect(config.Strategies.Whitelist).toBeUndefined();
    expect(config.ProposalValidations.VotingPower).toBeUndefined();
    expect(config.ExecutionStrategies.SimpleQuorumAvatar).toBeUndefined();
    expect(config.ExecutionStrategies.SimpleQuorumTimelock).toBeUndefined();
  });
});

describe('createEvmConfig', () => {
  it('should build registries for standard networks', () => {
    const evmConfig = createEvmConfig(evmNetworks.eth);

    expect(evmConfig.authenticators).toEqual({
      '0x5f9B7D78c9a37a439D78f801E0E339C6E711e260': { type: 'ethSig' },
      '0x95CF9B585fDb12DeB78002B5643dFF8fe67a496D': { type: 'ethSigV2' },
      '0xBA06E6cCb877C332181A6867c05c8b746A21Aed1': { type: 'ethTx' }
    });
    expect(evmConfig.strategies).toEqual({
      '0xC1245C5DCa7885C73E32294140F1e5d30688c202': { type: 'vanilla' },
      '0x0c2De612982Efd102803161fc7C74CcA15Db932c': { type: 'comp' },
      '0x2c8631584474E750CEdF2Fb6A904f2e84777Aefe': { type: 'ozVotes' },
      '0x34f0AfFF5A739bBf3E285615F50e40ddAaf2A829': { type: 'whitelist' }
    });
  });

  it('should omit disabled slots from registries', () => {
    const config = createStandardConfig(84532, {
      blockTime: 2,
      authenticators: { EthSigV2: null },
      strategies: { Comp: null, OZVotes: null, Whitelist: null },
      executionStrategies: {
        SimpleQuorumAvatar: null,
        SimpleQuorumTimelock: null
      }
    });

    const evmConfig = createEvmConfig(config);

    expect('undefined' in evmConfig.authenticators).toBe(false);
    expect('undefined' in evmConfig.strategies).toBe(false);
    expect(Object.keys(evmConfig.authenticators)).toEqual([
      '0x5f9B7D78c9a37a439D78f801E0E339C6E711e260',
      '0xBA06E6cCb877C332181A6867c05c8b746A21Aed1'
    ]);
    expect(Object.keys(evmConfig.strategies)).toEqual([
      '0xC1245C5DCa7885C73E32294140F1e5d30688c202'
    ]);
    expect(
      evmConfig.executionStrategiesImplementations.SimpleQuorumAvatar
    ).toBeUndefined();
    expect(
      evmConfig.executionStrategiesImplementations.SimpleQuorumTimelock
    ).toBeUndefined();
  });
});
