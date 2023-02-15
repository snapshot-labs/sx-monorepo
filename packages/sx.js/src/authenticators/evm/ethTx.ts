import EthTxAuthenticatorAbi from './abis/EthTxAuthenticator.json';
import type { Envelope } from '../../clients/evm/types';
import type { Authenticator, Propose, Vote, EthCall } from '../../types/index';

export default function createEthTxAuthenticator(): Authenticator<'evm'> {
  return {
    type: 'ethTx',
    createCall(envelope: Envelope<Propose | Vote>, selector: string, calldata: string[]): EthCall {
      const { space } = envelope.data;

      return {
        abi: EthTxAuthenticatorAbi,
        args: [space, selector, ...calldata]
      };
    }
  };
}
