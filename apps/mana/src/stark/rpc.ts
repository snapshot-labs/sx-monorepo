import { Provider, Account, constants } from 'starknet';
import { clients, goerli1, goerli2 } from '@snapshot-labs/sx';
import { rpcError, rpcSuccess } from '../utils';

export const NETWORKS = {
  [constants.StarknetChainId.SN_GOERLI]: goerli1,
  [constants.StarknetChainId.SN_GOERLI2]: goerli2
} as const;

const starknetPrivkey = process.env.STARKNET_PRIVKEY || '';
const starknetAddress = process.env.STARKNET_ADDRESS || '';

export const createNetworkHandler = (chainId: string) => {
  const networkConfig = NETWORKS[chainId];
  if (!networkConfig) throw new Error('Unsupported chainId');

  const baseUrl =
    chainId === constants.StarknetChainId.SN_GOERLI
      ? 'https://alpha4.starknet.io'
      : 'https://alpha4-2.starknet.io';

  const starkProvider = new Provider({
    sequencer: {
      baseUrl
    }
  });

  const client = new clients.StarkNetTx({
    starkProvider,
    ethUrl: process.env.ETH_RPC_URL as string
  });
  const account = new Account(starkProvider, starknetAddress, starknetPrivkey);

  async function send(id, params, res) {
    try {
      const { signatureData } = params.envelope;
      const { address, primaryType, message } = signatureData;
      let receipt;

      console.time('Send');
      console.log('Type', primaryType);
      console.log('Address', address);
      console.log('Message', message);

      if (primaryType === 'Propose') {
        console.log('Propose');
        receipt = await client.propose(account, params.envelope);
      } else if (primaryType === 'UpdateProposal') {
        console.log('Propose');
        receipt = await client.propose(account, params.envelope);
      } else if (primaryType === 'Vote') {
        console.log('Vote');
        receipt = await client.vote(account, params.envelope);
      }

      console.timeEnd('Send');
      console.log('Receipt', receipt);

      return rpcSuccess(res, receipt, id);
    } catch (e) {
      console.log('Failed', e);
      return rpcError(res, 500, e, id);
    }
  }

  return { send };
};
