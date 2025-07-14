import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import {
  clients,
  getOffchainStrategy,
  offchainGoerli,
  offchainMainnet,
  OffchainNetworkConfig
} from '@snapshot-labs/sx';
import { setEnsTextRecord } from '@/helpers/ens';
import { getSwapLink } from '@/helpers/link';
import {
  getModuleAddressForTreasury,
  OSnapPlugin,
  parseInternalTransaction
} from '@/helpers/osnap';
import { getProvider } from '@/helpers/provider';
import { verifyNetwork } from '@/helpers/utils';
import { addressValidator as isValidAddress } from '@/helpers/validation';
import { METADATA as STARKNET_METADATA } from '@/networks/starknet';
import {
  Choice,
  NetworkID,
  Privacy,
  Proposal,
  Space,
  Statement,
  StrategyParsedMetadata,
  Transaction,
  User,
  UserProfile,
  VoteType
} from '@/types';
import { EDITOR_SNAPSHOT_OFFSET } from './constants';
import { getSdkChoice } from './helpers';
import { EDITOR_APP_NAME } from '../common/constants';
import {
  ConnectorType,
  ExecutionInfo,
  NetworkConstants,
  NetworkHelpers,
  ReadOnlyNetworkActions,
  SnapshotInfo,
  VotingPower
} from '../types';

type ReadOnlyExecutionSafe = {
  safeName: string;
  safeAddress: string;
  chainId: number;
  transactions: Transaction[];
};

type ReadOnlyExecutionPlugin = {
  safes: ReadOnlyExecutionSafe[];
};

const CONFIGS: Record<number, OffchainNetworkConfig> = {
  1: offchainMainnet,
  5: offchainGoerli
};

const STARKNET_CHAIN_IDS: string[] = Object.values(STARKNET_METADATA).map(
  metadata => metadata.chainId
);

export function createActions(
  constants: NetworkConstants,
  helpers: NetworkHelpers,
  chainId: 1 | 11155111
): ReadOnlyNetworkActions {
  const networkConfig = CONFIGS[chainId];

  const client = new clients.OffchainEthereumSig({
    networkConfig
  });

  async function verifyChainNetwork(
    web3: Web3Provider | Wallet,
    snapshotChainId: string | undefined
  ) {
    if (!snapshotChainId || STARKNET_CHAIN_IDS.includes(snapshotChainId)) {
      return;
    }

    if (
      web3 instanceof Web3Provider &&
      (web3.provider as any)._isSequenceProvider
    ) {
      await verifyNetwork(web3, Number(snapshotChainId));
    }
  }

  async function getPlugins(
    executions: ExecutionInfo[] | null,
    originalProposal: Proposal | null
  ) {
    const supportedPlugins = ['oSnap', 'readOnlyExecution'];

    const plugins = {} as {
      oSnap?: OSnapPlugin;
      readOnlyExecution?: ReadOnlyExecutionPlugin;
    };

    if (originalProposal) {
      for (const [name, plugin] of Object.entries(originalProposal.plugins)) {
        if (!supportedPlugins.includes(name)) {
          plugins[name] = plugin;
        }
      }
    }

    if (!executions) return plugins;

    const oSnapSafes = [] as OSnapPlugin['safes'];
    const readOnlyExecutionSafes = [] as ReadOnlyExecutionPlugin['safes'];
    for (const info of executions) {
      if (!info.transactions.length) continue;

      if (info.strategyType === 'oSnap') {
        const treasuryAddress = info.strategyAddress;
        const moduleAddress = await getModuleAddressForTreasury(
          info.chainId,
          treasuryAddress
        );

        oSnapSafes.push({
          safeName: info.treasuryName,
          safeAddress: treasuryAddress,
          network: info.chainId.toString(),
          transactions: info.transactions.map(tx =>
            parseInternalTransaction(tx)
          ),
          moduleAddress
        });
      } else if (info.strategyType === 'ReadOnlyExecution') {
        readOnlyExecutionSafes.push({
          safeName: info.treasuryName,
          safeAddress: info.strategyAddress,
          chainId: info.chainId,
          transactions: info.transactions
        });
      }
    }

    if (oSnapSafes.length > 0) {
      plugins.oSnap = { safes: oSnapSafes };
    }

    if (readOnlyExecutionSafes.length > 0) {
      plugins.readOnlyExecution = { safes: readOnlyExecutionSafes };
    }

    return plugins;
  }

  return {
    async propose(
      web3: Web3Provider | Wallet,
      connectorType: ConnectorType,
      account: string,
      space: Space,
      title: string,
      body: string,
      discussion: string,
      type: VoteType,
      choices: string[],
      privacy: Privacy,
      labels: string[],
      app: string,
      created: number,
      start: number,
      min_end: number,
      max_end: number,
      executions: ExecutionInfo[]
    ) {
      // TODO: remove this check after implementing starknet support on getProvider
      if (
        space.snapshot_chain_id &&
        STARKNET_CHAIN_IDS.includes(space.snapshot_chain_id)
      ) {
        throw new Error(
          'Proposal creation not supported for spaces on Starknet network'
        );
      }

      await verifyChainNetwork(web3, space.snapshot_chain_id);

      const provider = getProvider(Number(space.snapshot_chain_id));
      const plugins = await getPlugins(executions, null);
      const data = {
        space: space.id,
        title,
        body,
        type,
        discussion,
        choices,
        privacy: privacy === 'shutter' ? 'shutter' : '',
        labels,
        start,
        end: min_end,
        snapshot: (await provider.getBlockNumber()) - EDITOR_SNAPSHOT_OFFSET,
        plugins: JSON.stringify(plugins),
        app: app || EDITOR_APP_NAME,
        timestamp: created,
        from: account
      };

      return client.propose({
        signer: web3 instanceof Web3Provider ? web3.getSigner() : web3,
        data
      });
    },
    async updateProposal(
      web3: Web3Provider | Wallet,
      connectorType: ConnectorType,
      account: string,
      space: Space,
      proposal: Proposal,
      title: string,
      body: string,
      discussion: string,
      type: VoteType,
      choices: string[],
      privacy: Privacy,
      labels: string[],
      executions: ExecutionInfo[]
    ) {
      await verifyChainNetwork(web3, space.snapshot_chain_id);

      const plugins = await getPlugins(executions, proposal);

      const data = {
        proposal: proposal.proposal_id as string,
        space: space.id,
        title,
        body,
        type,
        discussion,
        choices,
        privacy: privacy === 'shutter' ? 'shutter' : '',
        labels,
        plugins: JSON.stringify(plugins),
        from: account
      };

      return client.updateProposal({
        signer: web3 instanceof Web3Provider ? web3.getSigner() : web3,
        data
      });
    },
    async flagProposal(
      web3: Web3Provider | Wallet,
      account: string,
      proposal: Proposal
    ) {
      await verifyChainNetwork(web3, proposal.space.snapshot_chain_id);

      return client.flagProposal({
        signer: web3 instanceof Web3Provider ? web3.getSigner() : web3,
        data: {
          proposal: proposal.proposal_id as string,
          space: proposal.space.id,
          from: account
        }
      });
    },
    async cancelProposal(
      web3: Web3Provider | Wallet,
      connectorType: ConnectorType,
      account: string,
      proposal: Proposal
    ) {
      await verifyChainNetwork(web3, proposal.space.snapshot_chain_id);

      return client.cancel({
        signer: web3 instanceof Web3Provider ? web3.getSigner() : web3,
        data: {
          proposal: proposal.proposal_id as string,
          space: proposal.space.id,
          from: account
        }
      });
    },
    async vote(
      web3: Web3Provider | Wallet,
      connectorType: ConnectorType,
      account: string,
      proposal: Proposal,
      choice: Choice,
      reason: string,
      app: string
    ): Promise<any> {
      await verifyChainNetwork(web3, proposal.space.snapshot_chain_id);

      const data = {
        space: proposal.space.id,
        proposal: proposal.proposal_id as string,
        type: proposal.type,
        choice: getSdkChoice(proposal.type, choice),
        authenticator: '',
        strategies: [],
        metadataUri: '',
        privacy: proposal.privacy,
        reason,
        app: app || EDITOR_APP_NAME,
        from: account
      };

      return client.vote({
        signer: web3 instanceof Web3Provider ? web3.getSigner() : web3,
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

      if (!strategy || !isValidAddress(voterAddress)) {
        return [
          {
            address: name,
            value: 0n,
            cumulativeDecimals: 0,
            displayDecimals: 0,
            token: null,
            symbol: ''
          }
        ];
      }

      const result = await strategy.getVotingPower(
        spaceId,
        voterAddress,
        strategiesOrValidationParams,
        {
          at: snapshotInfo.at || null,
          chainId: String(snapshotInfo.chainId)
        }
      );

      if (strategy.type !== 'remote-vp') {
        return [
          {
            address: strategiesNames[0],
            cumulativeDecimals: 0,
            displayDecimals: 0,
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
          cumulativeDecimals: decimals,
          displayDecimals: decimals,
          symbol: strategy.params.symbol,
          token: strategy.params.address,
          chainId: strategy.network,
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
    },
    transferOwnership: async (
      web3: Web3Provider,
      connectorType: ConnectorType,
      space: Space,
      owner: string
    ) => {
      await verifyNetwork(web3, chainId);

      return setEnsTextRecord(
        web3.getSigner(),
        space.id,
        'snapshot',
        owner,
        chainId
      );
    },
    createSpaceRaw: async (
      web3: Web3Provider,
      id: string,
      settings: string
    ) => {
      await verifyNetwork(web3, chainId);

      return client.createSpace({
        signer: web3.getSigner(),
        data: { space: id, settings }
      });
    },
    updateSettingsRaw: async (
      web3: Web3Provider,
      space: Space,
      settings: string
    ) => {
      await verifyNetwork(web3, chainId);

      return client.updateSpace({
        signer: web3.getSigner(),
        data: { space: space.id, settings }
      });
    },
    deleteSpace: async (web3: Web3Provider, space: Space) => {
      await verifyNetwork(web3, chainId);

      return client.deleteSpace({
        signer: web3.getSigner(),
        data: { space: space.id }
      });
    }
  };
}
