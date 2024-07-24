import VanillaAuthenticatorAbi from './abis/VanillaAuthenticator.json';
import {
  Authenticator,
  Call,
  Envelope,
  Propose,
  UpdateProposal,
  Vote
} from '../../clients/evm/types';

export default function createVanillaAuthenticator(): Authenticator {
  return {
    type: 'vanilla',
    createCall(
      envelope: Envelope<Propose | UpdateProposal | Vote>,
      selector: string,
      calldata: string[]
    ): Call {
      const { space } = envelope.data;

      return {
        abi: VanillaAuthenticatorAbi,
        args: [space, selector, ...calldata]
      };
    }
  };
}
