import * as utils from '../utils';
import type { Call } from 'starknet';
import type { Authenticator, Envelope, EthSigProposeMessage, EthSigVoteMessage } from '../types';

const ethSigAuthenticator: Authenticator = {
  type: 'ethSig',
  createCall(
    envelope: Envelope<EthSigProposeMessage | EthSigVoteMessage>,
    selector: string,
    calldata: string[]
  ): Call {
    const { sig, data } = envelope;
    const { space, authenticator, salt } = data.message;
    const { r, s, v } = utils.encoding.getRSVFromSig(sig);
    const rawSalt = utils.splitUint256.SplitUint256.fromHex(`0x${salt.toString(16)}`);

    return {
      contractAddress: authenticator,
      entrypoint: 'authenticate',
      calldata: [
        r.low,
        r.high,
        s.low,
        s.high,
        v,
        rawSalt.low,
        rawSalt.high,
        space,
        selector,
        calldata.length,
        ...calldata
      ]
    };
  }
};

export default ethSigAuthenticator;
