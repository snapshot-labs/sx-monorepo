import {
  TypedDataDomain,
  TypedDataField
} from '@ethersproject/abstract-signer';
import { BigNumberish } from '@ethersproject/bignumber';
import { Contract, ContractInterface } from '@ethersproject/contracts';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { verifyTypedData } from '@ethersproject/wallet';

type SignatureVerifier = (
  domain: Required<TypedDataDomain>,
  address: string,
  types: Record<string, TypedDataField[]>,
  message: Record<string, any>,
  signature: string
) => Promise<boolean>;

type VerifyOptions = {
  /** Allow ECDSA signatures. */
  ecdsa?: boolean;
  /** Allow EIP-1271 signatures. */
  eip1271?: boolean;
};

const ERC1271_ABI = [
  'function isValidSignature(bytes32 _hash, bytes memory _signature) public view returns (bytes4 magicValue)'
];
const ERC1271_ABI_OLD = [
  'function isValidSignature(bytes _hash, bytes memory _signature) public view returns (bytes4 magicValue)'
];
const ERC1271_MAGIC_VALUE = '0x1626ba7e';
const ERC1271_MAGIC_VALUE_OLD = '0x20c13b0b';

export const BASE_DOMAIN = {
  name: 'highlight',
  version: '0.1.0'
};

function isEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export const verifyEcdsaSignature: SignatureVerifier = async (
  domain,
  address,
  types,
  message,
  signature
) => {
  const recoveredAddress = verifyTypedData(domain, types, message, signature);

  return isEqual(recoveredAddress, address);
};

export const verifyEip1271Signature: SignatureVerifier = async (
  domain,
  address,
  types,
  message,
  signature
) => {
  const hash = _TypedDataEncoder.hash(domain, types, message);

  const params = [address, signature, hash] as const;

  const valid = await verifyEip1271SignatureWithAbi(
    domain.chainId,
    ERC1271_ABI,
    ERC1271_MAGIC_VALUE,
    ...params
  );
  if (valid) return true;

  const validOld = await verifyEip1271SignatureWithAbi(
    domain.chainId,
    ERC1271_ABI_OLD,
    ERC1271_MAGIC_VALUE_OLD,
    ...params
  );
  if (validOld) return true;
  return false;
};

async function verifyEip1271SignatureWithAbi(
  chainId: BigNumberish,
  abi: ContractInterface,
  magicValue: string,
  address: string,
  sig: string,
  hash: string
): Promise<boolean> {
  let returnValue: string;
  try {
    const provider = new StaticJsonRpcProvider(
      `https://rpc.snapshot.org/${chainId}`,
      Number(chainId)
    );

    const contract = new Contract(address, abi, provider);
    returnValue = await contract.isValidSignature(hash, sig);
  } catch {
    return false;
  }

  return isEqual(returnValue, magicValue);
}

export async function verifySignature(
  domain: Required<TypedDataDomain>,
  address: string,
  types: Record<string, TypedDataField[]>,
  message: Record<string, any>,
  signature: string,
  options: VerifyOptions
) {
  const params = [domain, address, types, message, signature] as const;

  if (options.ecdsa) {
    const valid = await verifyEcdsaSignature(...params);
    if (valid) return valid;
  }

  if (options.eip1271) {
    const valid = await verifyEip1271Signature(...params);
    if (valid) return valid;
  }

  return false;
}
