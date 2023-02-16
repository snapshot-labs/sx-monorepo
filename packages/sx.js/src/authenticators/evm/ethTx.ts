import EthTxAuthenticatorAbi from './abis/EthTxAuthenticator.json';
import type { Authenticator, Envelope, Propose, Vote, Call } from '../../clients/evm/types';

export default function createEthTxAuthenticator(): Authenticator {
  return {
    type: 'ethTx',
    createCall(envelope: Envelope<Propose | Vote>, selector: string, calldata: string[]): Call {
      const { space } = envelope.data;

      return {
        abi: EthTxAuthenticatorAbi,
        args: [space, selector, ...calldata]
      };
    }
  };
}
