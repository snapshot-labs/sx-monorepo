import EthTxAuthenticatorAbi from './abis/EthTxAuthenticator.json';
import type {
  Authenticator,
  Envelope,
  VanillaProposeMessage,
  VanillaVoteMessage,
  EthCall
} from '../../types/index';

export default function createEthTxAuthenticator(): Authenticator<EthCall> {
  return {
    type: 'ethTx',
    createCall(
      envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
      selector: string,
      calldata: string[]
    ): EthCall {
      const { space } = envelope.data.message;

      return {
        abi: EthTxAuthenticatorAbi,
        args: [space, selector, ...calldata]
      };
    }
  };
}
