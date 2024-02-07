import EthTxAuthenticatorAbi from './abis/EthTxAuthenticator.json';
import type {
  Authenticator,
  Envelope,
  Propose,
  UpdateProposal,
  Vote,
  Call
} from '../../clients/evm/types';

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
