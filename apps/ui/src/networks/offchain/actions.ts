import { OffchainNetworkConfig, clients, offchainGoerli, offchainMainnet } from '@snapshot-labs/sx';
import { fetchScoreApi, getSdkChoice } from './helpers';
import { EDITOR_APP_NAME, EDITOR_SNAPSHOT_OFFSET, PROPOSAL_VALIDATIONS } from './constants';
import { getUrl } from '@/helpers/utils';
import { getProvider } from '@/helpers/provider';
import type { Web3Provider } from '@ethersproject/providers';
import type { StrategyParsedMetadata, Choice, Proposal, Space } from '@/types';
import type {
  ReadOnlyNetworkActions,
  NetworkConstants,
  NetworkHelpers,
  SnapshotInfo,
  VotingPower,
  Connector
} from '../types';

const CONFIGS: Record<number, OffchainNetworkConfig> = {
  1: offchainMainnet,
  5: offchainGoerli
};

export function createActions(
  constants: NetworkConstants,
  helpers: NetworkHelpers,
  chainId: number
): ReadOnlyNetworkActions {
  const networkConfig = CONFIGS[chainId];

  const client = new clients.OffchainEthereumSig({
    networkConfig
  });

  return {
    async propose(
      web3: Web3Provider,
      connectorType: Connector,
      account: string,
      space: Space,
      cid: string
    ) {
      let payload: { title: string; body: string; discussion: string };

      try {
        const response = fetch(getUrl(cid) as string);
        payload = await (await response).json();
      } catch (e) {
        throw new Error('Failed to fetch proposal metadata');
      }

      const currentTime = Math.floor(+new Date() / 1e3);
      const startTime = currentTime + space.voting_delay;
      const provider = getProvider(space.snapshot_chain_id as number);

      const data = {
        space: space.id,
        title: payload.title,
        body: payload.body,
        type: 'basic',
        discussion: payload.discussion,
        choices: ['For', 'Against', 'Abstain'],
        start: startTime,
        end: startTime + space.min_voting_period,
        snapshot: (await provider.getBlockNumber()) - EDITOR_SNAPSHOT_OFFSET,
        plugins: '{}',
        app: EDITOR_APP_NAME,
        timestamp: currentTime
      };

      return client.propose({ signer: web3.getSigner(), data });
    },
    vote(
      web3: Web3Provider,
      connectorType: Connector,
      account: string,
      proposal: Proposal,
      choice: Choice
    ): Promise<any> {
      const data = {
        space: proposal.space.id,
        proposal: proposal.proposal_id as string,
        type: proposal.type,
        choice: getSdkChoice(proposal.type, choice),
        authenticator: '',
        strategies: [],
        metadataUri: ''
      };

      return client.vote({
        signer: web3.getSigner(),
        data
      });
    },
    send: (envelope: any) => client.send(envelope),
    getVotingPower: async (
      strategiesAddresses: string[],
      strategiesParams: any[],
      strategiesMetadata: StrategyParsedMetadata[],
      voterAddress: string,
      snapshotInfo: SnapshotInfo
    ): Promise<VotingPower[]> => {
      if (Object.keys(PROPOSAL_VALIDATIONS).includes(strategiesAddresses[0])) {
        const strategyName = strategiesAddresses[0];
        const strategyParams = strategiesParams[0];
        let isValid = false;

        if (strategyName === 'only-members') {
          isValid = strategyParams.addresses
            .map((address: string) => address.toLowerCase())
            .includes(voterAddress.toLowerCase());
        } else {
          isValid = await fetchScoreApi('validate', {
            validation: strategyName,
            author: voterAddress,
            space: '',
            network: snapshotInfo.chainId,
            snapshot: snapshotInfo.at ?? 'latest',
            params: strategyParams
          });
        }

        return [
          {
            address: strategyName,
            decimals: 0,
            symbol: '',
            token: '',
            chainId: snapshotInfo.chainId,
            value: isValid ? 1n : 0n
          }
        ];
      } else {
        const result = await fetchScoreApi('get_vp', {
          address: voterAddress,
          space: '',
          strategies: strategiesParams,
          network: snapshotInfo.chainId ?? chainId,
          snapshot: snapshotInfo.at ?? 'latest'
        });

        return result.vp_by_strategy.map((vp: number, index: number) => {
          const strategy = strategiesParams[index];
          const decimals = parseInt(strategy.params.decimals || 0);

          return {
            address: strategy.name,
            value: BigInt(vp * 10 ** decimals),
            decimals,
            symbol: strategy.params.symbol,
            token: strategy.params.address,
            chainId: strategy.network ? parseInt(strategy.network) : undefined
          } as VotingPower;
        });
      }
    }
  };
}
