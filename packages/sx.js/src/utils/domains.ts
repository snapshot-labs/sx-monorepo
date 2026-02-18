import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { EVM_EMPTY_ADDRESS } from './ens';

/**
 * Get the owner of a Shibarium (.shib) domain
 */
export async function getShibariumDomainOwner(
  provider: Provider,
  name: string
): Promise<string> {
  const registryAbi = ['function owner(bytes32) view returns (address)'];
  const registryAddress = '0x02b1Ae77a62099FD24dca4239b16a51168A14942'; // Shibarium registry

  // Simple namehash implementation for .shib domains
  const { keccak256 } = await import('@ethersproject/keccak256');
  const { toUtf8Bytes } = await import('@ethersproject/strings');
  
  const labels = name.split('.');
  let node =
    '0x0000000000000000000000000000000000000000000000000000000000000000';
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak256(toUtf8Bytes(labels[i]));
    node = keccak256(node + labelHash.slice(2));
  }

  const contract = new Contract(registryAddress, registryAbi, provider);
  try {
    const owner = await contract.owner(node);
    return owner || EVM_EMPTY_ADDRESS;
  } catch {
    return EVM_EMPTY_ADDRESS;
  }
}

/**
 * Get the owner of an Unstoppable Domains name (e.g., .sonic)
 */
export async function getUnstoppableDomainOwner(
  provider: Provider,
  name: string
): Promise<string> {
  const registryAbi = [
    'function namehash(string) pure returns (uint256)',
    'function ownerOf(uint256) view returns (address)'
  ];
  
  // Unstoppable Domains registry on Sonic
  const registryAddress = '0xc3C2BAB5e3e52DBF311b2aAcEf2e40344f19494E';

  try {
    const contract = new Contract(registryAddress, registryAbi, provider);
    const tokenId = await contract.namehash(name);
    const owner = await contract.ownerOf(tokenId);
    return owner || EVM_EMPTY_ADDRESS;
  } catch {
    return EVM_EMPTY_ADDRESS;
  }
}
