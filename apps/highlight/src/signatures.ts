import {
  TypedDataDomain,
  TypedDataField
} from '@ethersproject/abstract-signer';
import { defaultAbiCoder } from '@ethersproject/abi';
import { BigNumberish } from '@ethersproject/bignumber';
import { Contract, ContractInterface } from '@ethersproject/contracts';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { verifyTypedData } from '@ethersproject/wallet';

const ERC1271_ABI = [
  'function isValidSignature(bytes32 _hash, bytes memory _signature) public view returns (bytes4 magicValue)'
];
const ERC1271_ABI_OLD = [
  'function isValidSignature(bytes _hash, bytes memory _signature) public view returns (bytes4 magicValue)'
];
const ERC1271_MAGIC_VALUE = '0x1626ba7e';
const ERC1271_MAGIC_VALUE_OLD = '0x20c13b0b';

const EIP_6492_MAGIC_SUFFIX =
  '6492649264926492649264926492649264926492649264926492649264926492';

// ERC-6492 UniversalSigValidator creation code
// See https://eips.ethereum.org/EIPS/eip-6492
const UNIVERSAL_SIG_VALIDATOR_CREATION_CODE =
  '0x608060405234801561001057600080fd5b5060405161069438038061069483398101604081905261002f916104a5565b600061003c848484610048565b90508060005260206000f35b60007f649264926492649264926492649264926492649264926492649264926492649283101561016d576000606084901c6001600160a01b031684600052366020600460003760006000602060006000855af160008111610100576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152603260248201527f5369676e617475726556616c696461746f72237265636f7665725369676e657260448201527f3a206465706c6f796d656e74206661696c65640000000000000000000000000060648201526084015b60405180910390fd5b604051630b135d3f60e11b808252906020600483016000885af1919050600051901561014657600086600052602060006004600089855af160008111610144575060005191505b505b8060011461015b5760009350505050610165565b6001935050505061016581565b949350505050565b604051630b135d3f60e11b808252906020600483016000885af1919050600051901561021a576000606084901c6001600160a01b031684600052366020600460003760006000602060006000855af16000811161020c576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152603260248201527f5369676e617475726556616c696461746f72237265636f7665725369676e657260448201527f3a206465706c6f796d656e74206661696c656400000000000000000000000000606482015260840160405180910390fd5b600086600052602060006004600089855af160008111610246576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152603260248201527f5369676e617475726556616c696461746f72237265636f7665725369676e657260448201527f3a206465706c6f796d656e74206661696c656400000000000000000000000000606482015260840160405180910390fd5b60005190505b806001146102615760009350505050610165565b8415610272576001935050505061016581565b6000604051836040820152846020820152866060516020016000855af1600051909150806001146102aa5760009450505050506101656103ed565b60408051600481526024810182526020810180516001600160e01b03166325a2a09960e21b1790529051600091829182906001600160a01b038b169061031e906020017f19457468657265756d205369676e6564204d6573736167653a0a333200000000815260008051602061067483398151915260208201526040015b604051602081830303815290604052905090565b6040516020818303038152906040529050600060208201519050856001600160a01b031681036103555760019750505050505050610165565b600060405160208152604060208201526040808201526001600160a01b038816606082015287516080820152602088015160a082015260c0016020604051602081039080840390855afa158015610100573d6000803e3d6000fd5b8060011461015b5760009350505050610165565b60006040518060400160405280601c81526020017f19457468657265756d205369676e6564204d6573736167653a0a333200000000815250905060008060005b60018110156104445761043f816001610567565b610401565b5060009b9a5050505050505050505050565b634e487b7160e01b600052604160045260246000fd5b60005b8381101561048757818101518382015260200161046f565b50506000910152565b80516001600160a01b03811681146104a057600080fd5b919050565b6000806000606084860312156104ba57600080fd5b6104c384610490565b60208501519093507fffffffff000000000000000000000000000000000000000000000000000000008116811461050057600080fd5b604085015190925067ffffffffffffffff8082111561051e57600080fd5b818601915086601f83011261053257600080fd5b81518181111561054457610544610456565b604051601f8201601f19908116603f0116810190838211818310171561056c5761056c610456565b8160405282815289602084870101111561058557600080fd5b61059683602083016020880161046c565b80955050505050509250925092565b634e487b7160e01b600052601160045260246000fd5b818103818111156105ce576105ce6105a5565b92915050565b808201808211156105ce576105ce6105a556fe19457468657265756d205369676e6564204d6573736167653a0a3332000000000000000000000000000000000000000000000000000000000000000000000000';

function isEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function isEip6492Signature(signature: string): boolean {
  const raw = signature.startsWith('0x') ? signature.slice(2) : signature;
  return raw.endsWith(EIP_6492_MAGIC_SUFFIX);
}

const NETWORK_NODE_URL =
  process.env.NETWORK_NODE_URL || 'http://127.0.0.1:8545';

async function verifyEcdsaSignature(
  domain: Required<TypedDataDomain>,
  address: string,
  types: Record<string, TypedDataField[]>,
  message: Record<string, any>,
  signature: string
): Promise<boolean> {
  try {
    const recoveredAddress = verifyTypedData(domain, types, message, signature);
    return isEqual(recoveredAddress, address);
  } catch {
    return false;
  }
}

async function verifyEip1271SignatureWithAbi(
  chainId: BigNumberish,
  abi: ContractInterface,
  magicValue: string,
  address: string,
  sig: string,
  hash: string
): Promise<boolean> {
  try {
    const provider = new StaticJsonRpcProvider(
      NETWORK_NODE_URL,
      Number(chainId)
    );
    const contract = new Contract(address, abi, provider);
    const returnValue: string = await contract.isValidSignature(hash, sig);
    return isEqual(returnValue, magicValue);
  } catch {
    return false;
  }
}

async function verifyEip1271Signature(
  domain: Required<TypedDataDomain>,
  address: string,
  types: Record<string, TypedDataField[]>,
  message: Record<string, any>,
  signature: string
): Promise<boolean> {
  const hash = _TypedDataEncoder.hash(domain, types, message);
  const params = [address, signature, hash] as const;

  return (
    (await verifyEip1271SignatureWithAbi(
      domain.chainId,
      ERC1271_ABI,
      ERC1271_MAGIC_VALUE,
      ...params
    )) ||
    (await verifyEip1271SignatureWithAbi(
      domain.chainId,
      ERC1271_ABI_OLD,
      ERC1271_MAGIC_VALUE_OLD,
      ...params
    ))
  );
}

async function verifyEip6492Signature(
  domain: Required<TypedDataDomain>,
  address: string,
  types: Record<string, TypedDataField[]>,
  message: Record<string, any>,
  signature: string
): Promise<boolean> {
  const hash = _TypedDataEncoder.hash(domain, types, message);
  const constructorArgs = defaultAbiCoder.encode(
    ['address', 'bytes32', 'bytes'],
    [address, hash, signature]
  );
  const data = UNIVERSAL_SIG_VALIDATOR_CREATION_CODE + constructorArgs.slice(2);
  const provider = new StaticJsonRpcProvider(
    NETWORK_NODE_URL,
    Number(domain.chainId)
  );

  try {
    const result = await provider.call({ data });
    const [isValid] = defaultAbiCoder.decode(['bool'], result);
    return isValid;
  } catch {
    return false;
  }
}

export async function verifySignature(
  domain: Required<TypedDataDomain>,
  address: string,
  types: Record<string, TypedDataField[]>,
  message: Record<string, any>,
  signature: string
): Promise<boolean> {
  if (isEip6492Signature(signature)) {
    return verifyEip6492Signature(domain, address, types, message, signature);
  }

  const params = [domain, address, types, message, signature] as const;

  if (await verifyEcdsaSignature(...params)) return true;
  if (await verifyEip1271Signature(...params)) return true;

  return false;
}
