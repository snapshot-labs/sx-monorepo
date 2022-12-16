import { Provider, constants } from 'starknet';
import { clients as Clients } from '@snapshot-labs/sx';
import { SUPPORTED_AUTHENTICATORS, SUPPORTED_STRATEGIES } from '@/helpers/constants';
import type { Web3Provider } from '@ethersproject/providers';
import type { Wallet } from '@ethersproject/wallet';
import type { Space, Proposal } from '@/types';

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
  const vanillaExecutor = '0x4ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d';

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
    propose: (web3: Web3Provider | Wallet, account: string, space: Space, cid: string) => {
      const { authenticator, strategies } = pickAuthenticatorAndStrategies(
        space.authenticators,
        space.strategies
      );

      return client.propose(web3, account, {
        space: space.id,
        authenticator,
        strategies,
        executor: vanillaExecutor,
        metadataUri: `ipfs://${cid}`,
        executionParams: []
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
