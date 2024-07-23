import type {
  Authenticator,
  Call,
  Envelope,
  Propose,
  UpdateProposal,
  Vote
} from '../../clients/evm/types';
import EthTxAuthenticatorAbi from './abis/EthTxAuthenticator.json';

export default function createEthTxAuthenticator(): Authenticator {
  return {
    type: 'ethTx',
    createCall(
      envelope: Envelope<Propose | UpdateProposal | Vote>,
      selector: string,
      calldata: string[]
    ): Call {
      const { space } = envelope.data;

      return {
        abi: EthTxAuthenticatorAbi,
        args: [space, selector, ...calldata]
      };
    }
  };
}
