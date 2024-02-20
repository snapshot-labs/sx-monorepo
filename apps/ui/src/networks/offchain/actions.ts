import { OffchainNetworkConfig, clients, offchainGoerli, offchainMainnet } from '@snapshot-labs/sx';
import { getSdkChoice } from './helpers';
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
import { EDITOR_APP_NAME, EDITOR_SNAPSHOT_OFFSET, PROPOSAL_VALIDATIONS } from './constants';
import { getUrl } from '@/helpers/utils';
import { getProvider } from '@/helpers/provider';

const SCORE_URL = 'https://score.snapshot.org';
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
      const response = fetch(getUrl(cid) as string);
      const payload = await (await response).json();
      const startDate = Math.floor(+new Date() / 1000) + space.voting_delay;
      const provider = getProvider(space.snapshot_chain_id as number);

      const data = {
        space: space.id,
        title: payload.title,
        body: payload.body,
        type: 'basic',
        discussion: payload.discussion,
        choices: ['For', 'Against', 'Abstain'],
        start: startDate,
        end: startDate + space.min_voting_period,
        snapshot: (await provider.getBlockNumber()) - EDITOR_SNAPSHOT_OFFSET,
        plugins: '{}',
        app: EDITOR_APP_NAME
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
        choice: getSdkChoice(choice),
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
        console.log(strategiesAddresses, strategiesParams);
        return [
          {
            address: '',
            value: 1n,
            decimals: 0,
            symbol: '',
            token: '',
            chainId: undefined
          } as VotingPower
        ];
      } else {
        const result = await fetch(SCORE_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            method: 'get_vp',
            params: {
              address: voterAddress,
              space: '',
              strategies: strategiesParams,
              network: snapshotInfo.chainId ?? chainId,
              snapshot: snapshotInfo.at ?? 'latest'
            }
          })
        });
        const body = await result.json();

        return body.result.vp_by_strategy.map((vp: number, index: number) => {
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
