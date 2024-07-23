import type {
  Authenticator,
  Call,
  Envelope,
  Propose,
  UpdateProposal,
  Vote
} from '../../clients/evm/types';
import EthSigAuthenticatorAbi from './abis/EthSigAuthenticator.json';
import { getRSVFromSig, hexPadLeft } from '../../utils/encoding';

export default function createEthSigAuthenticator(): Authenticator {
  return {
    type: 'ethSig',
    createCall(
      envelope: Envelope<Propose | UpdateProposal | Vote>,
      selector: string,
      calldata: string[]
    ): Call {
      const { signatureData, data } = envelope;
      const { space } = data;

      if (!signatureData)
        throw new Error('signatureData is required for this authenticator');

      const { r, s, v } = getRSVFromSig(signatureData.signature);

      const args = [
        v,
        hexPadLeft(r.toHex()),
        hexPadLeft(s.toHex()),
        signatureData.message.salt || '0x00',
        space,
        selector,
        ...calldata
      ];

      return {
        abi: EthSigAuthenticatorAbi,
        args
      };
    }
  };
}
