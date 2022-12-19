import { Provider, constants } from 'starknet';
import { clients as Clients } from '@snapshot-labs/sx';
import { getExecutionData } from '@snapshot-labs/sx/dist/executors';
import { SUPPORTED_AUTHENTICATORS, SUPPORTED_STRATEGIES } from '@/helpers/constants';
import type { Web3Provider } from '@ethersproject/providers';
import type { Wallet } from '@ethersproject/wallet';
import type { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import type { Space, Proposal } from '@/types';

const EXECUTOR = '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81';

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

export function createActions() {
  const manaUrl: string = import.meta.env.VITE_MANA_URL || 'http://localhost:3000';
  const ethUrl: string = import.meta.env.VITE_ETH_RPC_URL;

  const starkProvider = new Provider({
    sequencer: {
      baseUrl: 'https://alpha4-2.starknet.io',
      chainId: constants.StarknetChainId.TESTNET2
    }
  });

  const client = new Clients.EthereumSig({
    starkProvider,
    manaUrl,
    ethUrl
  });

  return {
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

      const executionData = getExecutionData(EXECUTOR, { transactions });

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
    send: (envelope: any) => client.send(envelope)
  };
}
