import { AbiCoder } from '@ethersproject/abi';
import { evmNetworks, getEvmMerkleWhitelistRoot } from '@snapshot-labs/sx';
import { compareAddresses } from '@/helpers/utils';
import { getValidator } from '@/helpers/validation';
import { StrategyConfig, StrategyTemplate } from '@/networks/types';
import { Space, StrategyParsedMetadata } from '@/types';

const abiCoder = new AbiCoder();

export const VOTING_POWER_WITH_COOLDOWN_ABI = [
  'uint256',
  'uint256',
  'uint256',
  'tuple(address addr, bytes params)[]'
];

export const cooldownProperties = {
  cooldown: {
    type: 'string',
    format: 'uint32',
    pattern: '^[0-9]+$',
    title: 'Cooldown (seconds)',
    description:
      'Time since the last successful proposal before the counter resets. Each successful proposal restarts this timer. Zero disables the limit.',
    examples: ['604800']
  },
  maxActiveProposals: {
    type: 'string',
    format: 'uint32',
    pattern: '^[1-9][0-9]*$',
    title: 'Proposal limit per author',
    description:
      'Maximum successful proposals before the cooldown must elapse. This is not the number of open proposals. Closing or cancelling a proposal does not restore capacity.',
    examples: ['5']
  }
};

const cooldownValidator = getValidator({
  type: 'object',
  required: ['cooldown', 'maxActiveProposals', 'threshold'],
  properties: {
    ...cooldownProperties,
    threshold: {
      type: 'string',
      format: 'uint256',
      pattern: '^[0-9]+$'
    }
  }
});

export function hasValidCooldownParams(params: Record<string, unknown>) {
  return Object.keys(cooldownValidator.validate(params)).length === 0;
}

function decodePowerParams(params: string, types: string[]) {
  const decoded = abiCoder.decode(types, params);
  if (
    !params
      .toLowerCase()
      .startsWith(abiCoder.encode(types, decoded).toLowerCase())
  ) {
    throw new Error('Invalid proposal power encoding');
  }
  return decoded;
}

export function decodeVotingPowerWithCooldown(params: string) {
  const [cooldown, maxActiveProposals, threshold, strategies] =
    decodePowerParams(params, VOTING_POWER_WITH_COOLDOWN_ABI);

  return {
    cooldown: cooldown.toString() as string,
    maxActiveProposals: maxActiveProposals.toString() as string,
    threshold: threshold.toString() as string,
    strategies: strategies as { addr: string; params: string }[]
  };
}

/** Restore from onchain bytes, never from a possibly incomplete indexer list. */
export async function restoreVotingPowerWithCooldown(
  template: StrategyTemplate,
  rawParams: string,
  availableStrategies: StrategyTemplate[],
  metadata: StrategyParsedMetadata[]
): Promise<StrategyConfig | null> {
  try {
    const decoded = decodeVotingPowerWithCooldown(rawParams);
    if (
      !hasValidCooldownParams(decoded) ||
      !decoded.strategies.length ||
      decoded.strategies.length > 128
    ) {
      return null;
    }

    const strategies = await Promise.all(
      decoded.strategies.map(async (strategy, i) => {
        const nested = availableStrategies.find(({ address }) =>
          compareAddresses(address, strategy.addr)
        );
        if (!nested) throw new Error('Unsupported proposal power strategy');
        const params = nested.parseParams
          ? await nested.parseParams(strategy.params, metadata[i] ?? null)
          : {};

        if (nested.type === 'MerkleWhitelist') {
          const [root] = abiCoder.decode(['bytes32'], strategy.params);
          const entries = (params.whitelist as string)
            .split(/[\n,]/)
            .filter(entry => entry.trim())
            .map(entry => {
              const [address, votingPower] = entry
                .split(':')
                .map(value => value.trim());
              return { address, votingPower };
            });
          if (
            getEvmMerkleWhitelistRoot(entries).toLowerCase() !==
            root.toLowerCase()
          ) {
            throw new Error(
              'Whitelist metadata does not match the onchain root'
            );
          }
        }

        // Token addresses are contract parameters, not trusted metadata.
        if (nested.paramsDefinition?.properties?.contractAddress) {
          if (!/^0x[0-9a-f]{40}/i.test(strategy.params)) {
            throw new Error('Invalid token parameters');
          }
          params.contractAddress = strategy.params.slice(0, 42);
        }

        // Preserve bytes when only display metadata or the outer limit changes.
        const powerParams = (value: Record<string, unknown>) =>
          JSON.stringify({ ...value, symbol: undefined, decimals: undefined });
        const initialPowerParams = powerParams(params);
        return {
          ...nested,
          id: crypto.randomUUID(),
          params,
          generateParams: async (value: Record<string, unknown>) => {
            if (powerParams(value) === initialPowerParams) {
              return [strategy.params];
            }
            if (!nested.generateParams) {
              throw new Error('Cannot edit this strategy');
            }
            return nested.generateParams(value);
          }
        };
      })
    );

    const params = { ...decoded, strategies };
    const initialParams = JSON.stringify(params);
    return {
      ...template,
      id: crypto.randomUUID(),
      params,
      generateParams: async value => {
        if (JSON.stringify(value) === initialParams) return [rawParams];
        if (!template.generateParams) {
          throw new Error('Cannot edit this validator');
        }
        return template.generateParams(value);
      }
    };
  } catch {
    // Unsupported, malformed or missing metadata: block saving, not partial hydration.
    return null;
  }
}

/** Do not prepare proofs using an old indexer's empty or stale strategy list. */
export function isProposalValidationReady(space: Space): boolean {
  const config = evmNetworks[space.network as keyof typeof evmNetworks];
  if (!config || !['snapshot-x', 'snapshot-x-inco'].includes(space.protocol)) {
    return true;
  }
  const matches = (address?: string) =>
    !!address && compareAddresses(address, space.validation_strategy);
  if (matches(config.ProposalValidations.Vanilla)) return true;
  const withCooldown = matches(
    config.ProposalValidations.VotingPowerWithCooldown
  );
  if (!withCooldown && !matches(config.ProposalValidations.VotingPower)) {
    return false;
  }
  if (withCooldown && space.protocol !== 'snapshot-x') return false;

  try {
    let params: {
      threshold: string;
      strategies: { addr: string; params: string }[];
    };
    if (withCooldown) {
      const decoded = decodeVotingPowerWithCooldown(
        space.validation_strategy_params
      );
      if (BigInt(decoded.maxActiveProposals) === 0n) return false;
      params = decoded;
    } else {
      const [threshold, strategies] = decodePowerParams(
        space.validation_strategy_params,
        ['uint256', 'tuple(address addr, bytes params)[]']
      );
      params = { threshold: threshold.toString(), strategies };
    }
    return (
      // The current SDK encodes strategy indices as int8.
      params.strategies.length <= 128 &&
      params.threshold === space.proposal_threshold &&
      params.strategies.length ===
        space.voting_power_validation_strategy_strategies.length &&
      params.strategies.every(
        (strategy, i) =>
          compareAddresses(
            strategy.addr,
            space.voting_power_validation_strategy_strategies[i]
          ) &&
          strategy.params.toLowerCase() ===
            space.voting_power_validation_strategy_strategies_params[
              i
            ]?.toLowerCase()
      )
    );
  } catch {
    return false;
  }
}
