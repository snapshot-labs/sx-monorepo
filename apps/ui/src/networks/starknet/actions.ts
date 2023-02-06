import { Wallet } from '@ethersproject/wallet';
import { clients as Clients, getExecutionData, defaultNetwork, clients } from '@snapshot-labs/sx';
import { SUPPORTED_AUTHENTICATORS, SUPPORTED_EXECUTORS, SUPPORTED_STRATEGIES } from './constants';
import type { Provider } from 'starknet';
import type { Web3Provider } from '@ethersproject/providers';
import type { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import type { NetworkActions } from '@/networks/types';
import type { Space, Proposal, Transaction } from '@/types';

const EXECUTOR = '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81';

function convertToMetaTransactions(transactions: Transaction[]): MetaTransaction[] {
  return transactions.map((tx: Transaction) => ({
    ...tx,
    nonce: 0,
    operation: 0
  }));
}

function pickAuthenticatorAndStrategies(authenticators: string[], strategies: string[]) {
  const authenticator = authenticators.find(
    authenticator => SUPPORTED_AUTHENTICATORS[authenticator]
  );

  const selectedStrategies = strategies
    .map((strategy, index) => [index, strategy] as const)
    .filter(([, strategy]) => SUPPORTED_STRATEGIES[strategy])
    .map(([index]) => index);

  if (!authenticator || selectedStrategies.length === 0) {
    throw new Error('Unsupported space');
  }

  return { authenticator, strategies: selectedStrategies };
}

export function createActions(starkProvider: Provider): NetworkActions {
  const manaUrl: string = import.meta.env.VITE_MANA_URL || 'http://localhost:3000';
  const ethUrl: string = import.meta.env.VITE_ETH_RPC_URL;

  const client = new Clients.EthereumSig({
    starkProvider,
    manaUrl,
    ethUrl
  });

  return {
    async createSpace(
      web3: any,
      params: {
        controller: string;
        votingDelay: number;
        minVotingDuration: number;
        maxVotingDuration: number;
        proposalThreshold: bigint;
        qorum: bigint;
        authenticators: string[];
        votingStrategies: string[];
        votingStrategiesParams: string[][];
        executionStrategies: string[];
        metadataUri: string;
      }
    ) {
      const spaceManager = new clients.SpaceManager({
        starkProvider,
        account: web3.provider.account,
        disableEstimation: true
      });

      return spaceManager.deploySpace(params);
    },
    setMetadataUri: async (web3: any, spaceId: string, metadataUri: string) => {
      const spaceManager = new clients.SpaceManager({
        starkProvider,
        account: web3.provider.account,
        disableEstimation: true
      });

      return spaceManager.setMetadataUri(spaceId, metadataUri);
    },
    propose: (
      web3: Web3Provider | Wallet,
      account: string,
      space: Space,
      cid: string,
      transactions: MetaTransaction[]
    ) => {
      const { authenticator, strategies } = pickAuthenticatorAndStrategies(
        space.authenticators,
        space.strategies
      );

      const executionData = getExecutionData(EXECUTOR, defaultNetwork, { transactions });

      return client.propose(web3, account, {
        space: space.id,
        authenticator,
        strategies,
        metadataUri: `ipfs://${cid}`,
        ...executionData
      });
    },
    vote: (web3: Web3Provider | Wallet, account: string, proposal: Proposal, choice: number) => {
      const { authenticator, strategies } = pickAuthenticatorAndStrategies(
        proposal.space.authenticators,
        proposal.strategies
      );

      return client.vote(web3, account, {
        space: proposal.space.id,
        authenticator,
        strategies,
        proposal: proposal.proposal_id,
        choice
      });
    },
    finalizeProposal: async (web3: Web3Provider | Wallet, proposal: Proposal) => {
      const res = await fetch(
        `${manaUrl}/space/${proposal.space.id}/${proposal.proposal_id}/finalize`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transactions: convertToMetaTransactions(proposal.execution)
          })
        }
      );

      const { error, receipt } = await res.json();
      if (error) throw new Error('Finalization failed');

      return receipt;
    },
    receiveProposal: (web3: Web3Provider | Wallet, proposal: Proposal) => {
      const signer = Wallet.isSigner(web3) ? web3 : web3.getSigner();

      const zodiac = new Clients.Zodiac({ signer });

      const executor = proposal.space.executors.find(executor => SUPPORTED_EXECUTORS[executor]);
      if (!executor) throw new Error('Unsupported space');

      return zodiac.receiveProposal(proposal.space.id, executor, {
        transactions: convertToMetaTransactions(proposal.execution)
      });
    },
    executeTransactions: (web3: Web3Provider | Wallet, proposal: Proposal) => {
      // TODO: make it dynamic once we have way to fetch it somehow
      const proposalIndex = 3;

      const signer = Wallet.isSigner(web3) ? web3 : web3.getSigner();

      const zodiac = new Clients.Zodiac({ signer });

      const executor = proposal.space.executors.find(executor => SUPPORTED_EXECUTORS[executor]);
      if (!executor) throw new Error('Unsupported space');

      return zodiac.executeProposalTxBatch(
        proposalIndex,
        executor,
        convertToMetaTransactions(proposal.execution)
      );
    },
    send: (envelope: any) => client.send(envelope)
  };
}
