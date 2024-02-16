import { OffchainNetworkConfig, clients, offchainGoerli, offchainMainnet } from '@snapshot-labs/sx';
import { getSdkChoice } from './helpers';
import type { Web3Provider } from '@ethersproject/providers';
import type { StrategyParsedMetadata, Choice, Proposal } from '@/types';
import type {
  ReadOnlyNetworkActions,
  NetworkConstants,
  NetworkHelpers,
  SnapshotInfo,
  VotingPower,
  Connector
} from '../types';
import { verifyNetwork } from '@/helpers/utils';

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
    async vote(
      web3: Web3Provider,
      connectorType: Connector,
      account: string,
      proposal: Proposal,
      choice: Choice
    ): Promise<any> {
      await verifyNetwork(web3, proposal.space.snapshot_chain_id as number);

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
  };
}
