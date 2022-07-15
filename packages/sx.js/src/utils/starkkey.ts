import { Signature, ec, typedData } from 'starknet';
import { TypedData } from 'starknet/src/utils/typedData/types';

export function verify(pubKey: string, address: string, data: TypedData, signature: Signature) {
  const msgHash = typedData.getMessageHash(data, address);
  const pubKeyPair = ec.getKeyPairFromPublicKey(`0x${pubKey}`);
  return ec.verify(pubKeyPair, msgHash, signature);
}
