import VanillaAuthenticatorAbi from './abis/VanillaAuthenticator.json';
import type {
  Authenticator,
  Envelope,
  VanillaProposeMessage,
  VanillaVoteMessage,
  EthCall
} from '../../types';

export default function createVanillaAuthenticator(): Authenticator<EthCall> {
  return {
    type: 'vanilla',
    createCall(
      envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
      selector: string,
      calldata: string[]
    ): EthCall {
      const { space } = envelope.data.message;

      return {
        abi: VanillaAuthenticatorAbi,
        args: [space, selector, ...calldata]
      };
    }
  };
}
