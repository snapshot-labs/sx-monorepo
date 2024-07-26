import { isAddress } from '@ethersproject/address';
import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import {
  clients,
  getOffchainStrategy,
  offchainGoerli,
  offchainMainnet,
  OffchainNetworkConfig
} from '@snapshot-labs/sx';
import { getSwapLink } from '@/helpers/link';
import {
  getModuleAddressForTreasury,
  OSnapPlugin,
  parseInternalTransaction
} from '@/helpers/osnap';
import { getProvider } from '@/helpers/provider';
import { getUrl } from '@/helpers/utils';
import {
  Choice,
  NetworkID,
  Proposal,
  Space,
  Statement,
  StrategyParsedMetadata,
  User,
  UserProfile,
  VoteType
} from '@/types';
import { EDITOR_APP_NAME, EDITOR_SNAPSHOT_OFFSET } from './constants';
import { getSdkChoice } from './helpers';
import {
  Connector,
  ExecutionInfo,
  NetworkConstants,
  NetworkHelpers,
  ReadOnlyNetworkActions,
  SnapshotInfo,
  VotingPower
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

  async function getPlugins(executionInfo: ExecutionInfo | null) {
    const plugins = {} as { oSnap?: OSnapPlugin };
    if (executionInfo && executionInfo.transactions.length) {
      const treasuryAddress = executionInfo.strategyAddress;
      const moduleAddress = await getModuleAddressForTreasury(
        executionInfo.chainId.toString(),
        treasuryAddress
      );

      plugins.oSnap = {
        safes: [
          {
            safeName: executionInfo.treasuryName,
            safeAddress: treasuryAddress,
            network: executionInfo.chainId.toString(),
            transactions: executionInfo.transactions.map(tx =>
              parseInternalTransaction(tx)
            ),
            moduleAddress
          }
        ]
      };
    }

    return plugins;
  }

  return {
    async propose(
      web3: Web3Provider,
      connectorType: Connector,
      account: string,
      space: Space,
      cid: string,
      executionInfo: ExecutionInfo | null
    ) {
      let payload: {
        title: string;
        body: string;
        discussion: string;
        type: VoteType;
        choices: string[];
      };

      try {
        const res = await fetch(getUrl(cid) as string);
        payload = await res.json();
      } catch (e) {
        throw new Error('Failed to fetch proposal metadata');
      }

      const currentTime = Math.floor(Date.now() / 1e3);
      const startTime = currentTime + space.voting_delay;
      const provider = getProvider(space.snapshot_chain_id as number);

      const plugins = await getPlugins(executionInfo);

      const data = {
        space: space.id,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        discussion: payload.discussion,
        choices: payload.choices,
        start: startTime,
        end: startTime + space.min_voting_period,
        snapshot: (await provider.getBlockNumber()) - EDITOR_SNAPSHOT_OFFSET,
        plugins: JSON.stringify(plugins),
        app: EDITOR_APP_NAME,
        timestamp: currentTime
      };

      return client.propose({ signer: web3.getSigner(), data });
    },
    async updateProposal(
      web3: Web3Provider,
      connectorType: Connector,
      account: string,
      space: Space,
      proposalId: number | string,
      cid: string,
      executionInfo: ExecutionInfo | null
    ) {
      let payload: {
        title: string;
        body: string;
        discussion: string;
        type: VoteType;
        choices: string[];
      };

      try {
        const res = await fetch(getUrl(cid) as string);
        payload = await res.json();
      } catch (e) {
        throw new Error('Failed to fetch proposal metadata');
      }

      const plugins = await getPlugins(executionInfo);

      const data = {
        proposal: proposalId as string,
        space: space.id,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        discussion: payload.discussion,
        choices: payload.choices,
        plugins: JSON.stringify(plugins)
      };

      return client.updateProposal({ signer: web3.getSigner(), data });
    },
    cancelProposal(web3: Web3Provider, proposal: Proposal) {
      return client.cancel({
        signer: web3.getSigner(),
        data: {
          proposal: proposal.proposal_id as string,
          space: proposal.space.id
        }
      });
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
        metadataUri: '',
        privacy: proposal.privacy
      };

      return client.vote({
        signer: web3.getSigner(),
        data
      });
    },
    send: (envelope: any) => client.send(envelope),
    getVotingPower: async (
      spaceId: string,
      strategiesNames: string[],
      strategiesOrValidationParams: any[],
      strategiesMetadata: StrategyParsedMetadata[],
      voterAddress: string,
      snapshotInfo: SnapshotInfo
    ): Promise<VotingPower[]> => {
      // This is bit hacky at the moment as for offchain spaces we validate all strategies at once instead of per-strategy validation.
      // Additionally there is only one proposal validation strategy where on SX there could be multiple (underlying) strategies.
      // This means this function will be a bit of mess until getVotingPower function become more generic (can it?).

      const name = strategiesNames[0];
      const strategy = getOffchainStrategy(name);

      if (!strategy || !isAddress(voterAddress)) {
        return [
          { address: name, value: 0n, decimals: 0, token: null, symbol: '' }
        ];
      }

      const result = await strategy.getVotingPower(
        spaceId,
        voterAddress,
        strategiesOrValidationParams,
        snapshotInfo
      );

      if (strategy.type !== 'remote-vp') {
        return [
          {
            address: strategiesNames[0],
            decimals: 0,
            symbol: '',
            token: '',
            chainId: snapshotInfo.chainId,
            value: result[0]
          }
        ];
      }

      return result.map((value: bigint, index: number) => {
        const strategy = strategiesOrValidationParams[index];
        const decimals = parseInt(strategy.params.decimals || 18);

        return {
          address: strategy.name,
          value,
          decimals,
          symbol: strategy.params.symbol,
          token: strategy.params.address,
          chainId: strategy.network ? parseInt(strategy.network) : undefined,
          swapLink: getSwapLink(
            strategy.name,
            strategy.params.address,
            strategy.network
          )
        };
      });
    },
    followSpace(
      web3: Web3Provider | Wallet,
      networkId: NetworkID,
      spaceId: string,
      from?: string
    ) {
      return client.followSpace({
        signer: web3 instanceof Web3Provider ? web3.getSigner() : web3,
        data: { network: networkId, space: spaceId, ...(from ? { from } : {}) }
      });
    },
    unfollowSpace(
      web3: Web3Provider | Wallet,
      networkId: NetworkID,
      spaceId: string,
      from?: string
    ) {
      return client.unfollowSpace({
        signer: web3 instanceof Web3Provider ? web3.getSigner() : web3,
        data: { network: networkId, space: spaceId, ...(from ? { from } : {}) }
      });
    },
    setAlias(web3: Web3Provider, alias: string) {
      return client.setAlias({
        signer: web3.getSigner(),
        data: { alias }
      });
    },
    async updateUser(web3: Web3Provider | Wallet, user: User, from?: string) {
      const profile: Partial<UserProfile> = {
        name: user.name,
        about: user.about,
        avatar: user.avatar,
        cover: user.cover,
        github: user.github,
        twitter: user.twitter,
        lens: user.lens,
        farcaster: user.farcaster
      };

      return client.updateUser({
        signer: web3 instanceof Web3Provider ? web3.getSigner() : web3,
        data: { profile: JSON.stringify(profile), ...(from ? { from } : {}) }
      });
    },
    async updateStatement(
      web3: Web3Provider | Wallet,
      statement: Statement,
      from?: string
    ) {
      return client.updateStatement({
        signer: web3 instanceof Web3Provider ? web3.getSigner() : web3,
        data: { ...statement, ...(from ? { from } : {}) }
      });
    }
  };
}
