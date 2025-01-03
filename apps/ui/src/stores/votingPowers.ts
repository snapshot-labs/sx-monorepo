import { utils } from '@snapshot-labs/sx';
import { defineStore } from 'pinia';
import { compareAddresses } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { VotingPower, VotingPowerStatus } from '@/networks/types';
import { Proposal, Space } from '@/types';

const LATEST_BLOCK_NAME = 'latest';

type SpaceDetails = Proposal['space'];
export type VotingPowerItem = {
  votingPowers: VotingPower[];
  status: VotingPowerStatus;
  symbol: string;
  error: utils.errors.VotingPowerDetailsError | null;
  canPropose: boolean;
  canVote: boolean;
};

export function getIndex(space: SpaceDetails, block: number | null): string {
  // NOTE: this splits the cache for spaces and proposals
  // having it combined casues issues (if we fetch VP for proposal first and then
  // space, canPropose will never be updated).
  // we probably should separate it entirely (no more multipurpose VotingPowerItem)
  // as it it's causing bugs and it's hard to understand

  const prefix = isSpace(space) ? 'space' : 'proposal';

  return `${prefix}:${space.id}:${block ?? LATEST_BLOCK_NAME}`;
}

function isSpace(item: SpaceDetails | Proposal): item is Space {
  return 'proposal_threshold' in item;
}

function isSpaceMember(space: Space, account: string): boolean {
  return [
    ...(space.additionalRawData?.admins || []),
    ...(space.additionalRawData?.moderators || []),
    ...(space.additionalRawData?.members || [])
  ]
    .filter(Boolean)
    .some(member => compareAddresses(member, account));
}

export const useVotingPowersStore = defineStore('votingPowers', () => {
  const votingPowers = reactive<Map<string, VotingPowerItem>>(new Map());

  async function fetch(
    item: Space | Proposal,
    account: string,
    block: number | null
  ) {
    const space = 'space' in item ? item.space : item;

    const existingVotingPower = votingPowers.get(getIndex(space, block));
    if (existingVotingPower && existingVotingPower.status === 'success') return;

    const network = getNetwork(item.network);

    let vpItem: VotingPowerItem = {
      status: 'loading',
      votingPowers: [],
      symbol: space.voting_power_symbol,
      error: null,
      canPropose: false,
      canVote: false
    };

    if (existingVotingPower) {
      existingVotingPower.status = 'loading';
      votingPowers.set(getIndex(space, block), existingVotingPower);
    }

    try {
      const opts = {
        at: block,
        chainId: space.snapshot_chain_id
      };

      const [vp, proposeVp] = await Promise.all([
        network.actions.getVotingPower(
          space.id,
          item.strategies,
          item.strategies_params,
          space.strategies_parsed_metadata,
          account,
          opts
        ),
        isSpace(item)
          ? network.actions.getVotingPower(
              space.id,
              item.voting_power_validation_strategy_strategies,
              item.voting_power_validation_strategy_strategies_params,
              item.voting_power_validation_strategies_parsed_metadata,
              account,
              opts
            )
          : Promise.resolve(null)
      ]);

      vpItem = {
        ...vpItem,
        votingPowers: vp,
        status: 'success'
      };

      if (isSpace(item) && proposeVp) {
        const totalProposeVp = proposeVp.reduce(
          (acc, b) => acc + Number(b.value) / 10 ** b.cumulativeDecimals,
          0
        );

        vpItem.canPropose =
          totalProposeVp >= BigInt(item.proposal_threshold) ||
          isSpaceMember(space as Space, account);
      } else {
        vpItem.canVote = vp.some(vp => vp.value > 0n);
      }
    } catch (e: unknown) {
      if (e instanceof utils.errors.VotingPowerDetailsError) {
        vpItem.error = e;
      } else {
        console.warn('Failed to load voting power', e);
      }

      vpItem.status = 'error';
    }
    votingPowers.set(getIndex(space, block), vpItem);
  }

  function reset() {
    votingPowers.clear();
  }

  return {
    votingPowers,
    fetch,
    reset
  };
});
