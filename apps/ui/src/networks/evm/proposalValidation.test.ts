import { AbiCoder } from '@ethersproject/abi';
import { evmNetworks } from '@snapshot-labs/sx';
import { encodeAbiParameters, keccak256, parseAbiParameters } from 'viem';
import { describe, expect, it, vi } from 'vitest';
import { validateForm } from '@/helpers/validation';
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { Space, StrategyParsedMetadata } from '@/types';
import { createConstants } from './constants';
import {
  decodeVotingPowerWithCooldown,
  isProposalValidationReady,
  restoreVotingPowerWithCooldown
} from './proposalValidation';

const pin = vi.fn(async () => ({ provider: 'dummy', cid: 'metadata' }));
const constants = createConstants('eth', { pin });
const template = constants.EDITOR_PROPOSAL_VALIDATIONS.find(
  s => s.type === 'VotingPowerWithCooldown'
)! as StrategyTemplate;
const token = '0x0000000000000000000000000000000000000001';
const nested = {
  ...constants.EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES.find(
    s => s.address === evmNetworks.eth.Strategies.OZVotes
  )!,
  id: 'token',
  params: { contractAddress: token, symbol: 'TKN', decimals: 18 }
} as StrategyConfig;
const params = {
  cooldown: '604800',
  maxActiveProposals: '5',
  threshold: ((1n << 255n) + 1n).toString(),
  strategies: [nested]
};
const metadata = [
  {
    token: '0x0000000000000000000000000000000000000002',
    symbol: 'TKN',
    decimals: 18
  }
] as StrategyParsedMetadata[];
const encode = (values = params) =>
  template.generateParams!(values).then(([encoded]) => encoded as string);

function space(encoded: string): Space {
  return {
    network: 'eth',
    protocol: 'snapshot-x',
    validation_strategy: template.address,
    validation_strategy_params: encoded,
    proposal_threshold: params.threshold,
    voting_power_validation_strategy_strategies: [nested.address],
    voting_power_validation_strategy_strategies_params: [token]
  } as Space;
}

describe('voting power with cooldown', () => {
  it('encodes the exact Solidity layout and round-trips large thresholds without scaling', async () => {
    const encoded = await encode();
    expect(encoded).toBe(
      encodeAbiParameters(
        parseAbiParameters('uint256, uint256, uint256, (address,bytes)[]'),
        [
          604800n,
          5n,
          BigInt(params.threshold),
          [[nested.address as `0x${string}`, token]]
        ]
      )
    );
    expect(await template.parseParams!(encoded, null)).toEqual({
      cooldown: '604800',
      maxActiveProposals: '5',
      threshold: params.threshold
    });
    expect(template.protocols).toEqual(['snapshot-x']);
  });

  it('keeps the old voting power encoding unchanged', async () => {
    const plain = constants.EDITOR_PROPOSAL_VALIDATIONS.find(
      s => s.type === 'VotingPower'
    )! as StrategyTemplate;
    const [encoded] = await plain.generateParams!(params);
    expect(encoded).toBe(
      new AbiCoder().encode(
        ['uint256', 'tuple(address addr, bytes params)[]'],
        [params.threshold, [{ addr: nested.address, params: token }]]
      )
    );
    expect(await plain.parseParams!(encoded, null)).toEqual({
      threshold: params.threshold
    });
  });

  it.each([
    ['threshold', '-1'],
    ['threshold', '+1'],
    ['threshold', '1.5'],
    ['threshold', '1e18'],
    ['threshold', '0x10'],
    ['threshold', (1n << 256n).toString()],
    ['threshold', 9007199254740992],
    ['cooldown', '-1'],
    ['cooldown', '4294967296'],
    ['cooldown', ''],
    ['maxActiveProposals', '0'],
    ['maxActiveProposals', '-1'],
    ['maxActiveProposals', '4294967296']
  ])(
    'rejects invalid %s = %s before generating bytes',
    async (field, value) => {
      const input = { ...params, [field]: value };
      expect(template.validate!(input)).toBe(false);
      await expect(encode(input as typeof params)).rejects.toThrow(
        'Invalid voting power with cooldown settings'
      );
      expect(
        Object.keys(
          validateForm(template.paramsDefinition, {
            cooldown: input.cooldown,
            maxActiveProposals: input.maxActiveProposals,
            threshold: input.threshold
          })
        ).length
      ).toBeGreaterThan(0);
    }
  );

  it('allows explicit zero threshold/cooldown and uint boundaries; requires supported proof indices', async () => {
    for (const input of [
      { ...params, cooldown: '0', threshold: '0', maxActiveProposals: '1' },
      {
        ...params,
        cooldown: '4294967295',
        maxActiveProposals: '4294967295',
        threshold: ((1n << 256n) - 1n).toString()
      }
    ]) {
      expect(template.validate!(input)).toBe(true);
      await expect(encode(input)).resolves.toMatch(/^0x/);
    }
    expect(template.validate!({ ...params, strategies: [] })).toBe(false);
    expect(
      template.validate!({ ...params, strategies: Array(129).fill(nested) })
    ).toBe(false);
    expect(
      template.validate!({ ...params, strategies: Array(128).fill(nested) })
    ).toBe(true);
  });

  it('preserves nested metadata order', async () => {
    const generated = await template.generateMetadata!({
      ...params,
      strategies: [nested, { ...nested, generateMetadata: undefined }]
    });
    expect(generated).toEqual({ strategies_metadata: ['ipfs://metadata', ''] });
  });

  it('restores settings from raw bytes, not a metadata token address, and preserves untouched bytes', async () => {
    const raw = `${await encode()}0000`;
    const restored = await restoreVotingPowerWithCooldown(
      template,
      raw,
      constants.EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES,
      metadata
    );
    expect(restored).not.toBeNull();
    expect(restored!.params.strategies[0].params.contractAddress).toBe(token);
    expect(await restored!.generateParams!(restored!.params)).toEqual([raw]);
    const [edited] = await restored!.generateParams!({
      ...restored!.params,
      maxActiveProposals: '2'
    });
    expect(decodeVotingPowerWithCooldown(edited).maxActiveProposals).toBe('2');
    expect(decodeVotingPowerWithCooldown(edited).strategies[0].params).toBe(
      token
    );
    const child = restored!.params.strategies[0] as StrategyConfig;
    expect(
      await child.generateParams!({
        ...child.params,
        symbol: 'NEW',
        decimals: 9
      })
    ).toEqual([token]);
    expect(
      await child.generateParams!({
        ...child.params,
        contractAddress: metadata[0].token
      })
    ).toEqual([metadata[0].token]);
  });

  it('blocks partial, unsupported, malformed or metadata-less settings hydration', async () => {
    expect(
      await restoreVotingPowerWithCooldown(
        template,
        await encode(),
        [],
        metadata
      )
    ).toBeNull();
    expect(
      await restoreVotingPowerWithCooldown(
        template,
        await encode(),
        constants.EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES,
        []
      )
    ).toBeNull();
    expect(
      await restoreVotingPowerWithCooldown(
        template,
        '0x1234',
        constants.EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES,
        metadata
      )
    ).toBeNull();
  });

  it('blocks stale or malformed API readback before eligibility or proof preparation', async () => {
    const current = space(await encode());
    expect(isProposalValidationReady(current)).toBe(true);
    expect(
      isProposalValidationReady({
        ...current,
        validation_strategy_params: '0x'
      })
    ).toBe(false);
    expect(
      isProposalValidationReady({ ...current, proposal_threshold: '0' })
    ).toBe(false);
    expect(
      isProposalValidationReady({
        ...current,
        voting_power_validation_strategy_strategies: []
      })
    ).toBe(false);
    expect(
      isProposalValidationReady({
        ...current,
        voting_power_validation_strategy_strategies_params: ['0x']
      })
    ).toBe(false);
  });

  it('rejects unknown and malformed power validators without affecting other protocols', async () => {
    const current = space(await encode());
    expect(
      isProposalValidationReady({ ...current, validation_strategy: token })
    ).toBe(false);
    expect(
      isProposalValidationReady({
        ...current,
        validation_strategy: evmNetworks.eth.ProposalValidations.VotingPower!,
        validation_strategy_params: '0x'
      })
    ).toBe(false);
    const plain = new AbiCoder().encode(
      ['uint256', 'tuple(address addr, bytes params)[]'],
      [params.threshold, [{ addr: nested.address, params: token }]]
    );
    expect(
      isProposalValidationReady({
        ...current,
        validation_strategy: evmNetworks.eth.ProposalValidations.VotingPower!,
        validation_strategy_params: plain
      })
    ).toBe(true);
    expect(
      isProposalValidationReady({
        ...current,
        protocol: '@openzeppelin/governor',
        validation_strategy: token
      })
    ).toBe(true);
    expect(
      isProposalValidationReady({ ...current, protocol: 'snapshot-x-inco' })
    ).toBe(false);
    expect(
      isProposalValidationReady({
        ...current,
        network: 'basesep',
        validation_strategy: evmNetworks.basesep.ProposalValidations.Vanilla!
      })
    ).toBe(true);
  });

  it('restores whitelist membership only when metadata matches the onchain root', async () => {
    const whitelist =
      constants.EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES.find(
        s => s.type === 'MerkleWhitelist'
      )!;
    const root = keccak256(
      keccak256(
        encodeAbiParameters(parseAbiParameters('address,uint96'), [token, 21n])
      )
    );
    const raw = (nestedParams: string) =>
      new AbiCoder().encode(
        [
          'uint256',
          'uint256',
          'uint256',
          'tuple(address addr, bytes params)[]'
        ],
        [
          '604800',
          '5',
          '1',
          [{ addr: whitelist.address, params: nestedParams }]
        ]
      );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ tree: [{ address: token, votingPower: '21' }] })
      }))
    );
    try {
      const restore = (nestedParams: string) =>
        restoreVotingPowerWithCooldown(
          template,
          raw(nestedParams),
          constants.EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES,
          [
            {
              symbol: 'VP',
              decimals: 0,
              payload: 'ipfs://tree'
            } as StrategyParsedMetadata
          ]
        );
      expect(await restore('0x1234')).toBeNull();
      expect(await restore(`0x${'00'.repeat(32)}`)).toBeNull();
      const restored = await restore(`${root}0000`);
      expect(restored).not.toBeNull();
      expect(restored!.params.strategies[0].params.whitelist).toBe(
        `${token}:21`
      );
      expect(await restored!.generateParams!(restored!.params)).toEqual([
        raw(`${root}0000`)
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('is absent on undeployed BNB networks', () => {
    for (const id of ['bnb', 'bnbt'] as const) {
      expect(
        createConstants(id, { pin }).EDITOR_PROPOSAL_VALIDATIONS.some(
          s => s.type === 'VotingPowerWithCooldown'
        )
      ).toBe(false);
    }
  });
});
