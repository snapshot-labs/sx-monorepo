import VanillaAuthenticatorAbi from './abis/VanillaAuthenticator.json';
import type { Envelope } from '../../clients/evm/types';
import type { Authenticator, Propose, Vote, EthCall } from '../../types';

export default function createVanillaAuthenticator(): Authenticator<'evm'> {
  return {
    type: 'vanilla',
    createCall(envelope: Envelope<Propose | Vote>, selector: string, calldata: string[]): EthCall {
      const { space } = envelope.data;

      return {
        abi: VanillaAuthenticatorAbi,
        args: [space, selector, ...calldata]
      };
    }
  };
}
