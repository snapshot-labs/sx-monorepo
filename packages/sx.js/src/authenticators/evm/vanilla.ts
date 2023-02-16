import VanillaAuthenticatorAbi from './abis/VanillaAuthenticator.json';
import type { Authenticator, Envelope, Propose, Vote, Call } from '../../clients/evm/types';

export default function createVanillaAuthenticator(): Authenticator {
  return {
    type: 'vanilla',
    createCall(envelope: Envelope<Propose | Vote>, selector: string, calldata: string[]): Call {
      const { space } = envelope.data;

      return {
        abi: VanillaAuthenticatorAbi,
        args: [space, selector, ...calldata]
      };
    }
  };
}
