import EthSigAuthenticatorAbi from './abis/EthSigAuthenticator.json';
import { getRSVFromSig, hexPadLeft } from '../../utils/encoding';
import type { Envelope } from '../../clients/evm/types';
import type { Authenticator, Propose, Vote, EthCall } from '../../types';

export default function createEthSigAuthenticator(): Authenticator<'evm'> {
  return {
    type: 'ethSig',
    createCall(envelope: Envelope<Propose | Vote>, selector: string, calldata: string[]): EthCall {
      const { signatureData, data } = envelope;
      const { space } = data;

      if (!signatureData) throw new Error('signatureData is required for this authenticator');

      const { r, s, v } = getRSVFromSig(signatureData.signature);

      const args = [
        v,
        hexPadLeft(r.toHex()),
        hexPadLeft(s.toHex()),
        signatureData.message.salt,
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
