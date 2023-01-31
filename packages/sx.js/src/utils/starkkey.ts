import { Signature, ec, typedData } from 'starknet';

export function verify(
  pubKey: string,
  address: string,
  data: typedData.TypedData,
  signature: Signature
) {
  const msgHash = typedData.getMessageHash(data, address);
  return ec.starkCurve.verify(signature.toDERHex(), msgHash, pubKey);
}
