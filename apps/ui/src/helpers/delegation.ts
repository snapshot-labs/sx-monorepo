import { hexZeroPad } from '@ethersproject/bytes';
import { Contract } from '@ethersproject/contracts';
import { enabledNetworks, evmNetworks } from '@/networks';
import { METADATA } from '@/networks/starknet';
import { ChainId, NetworkID, Space } from '@/types';
import { abis } from './abis';
import { verifyNetwork } from './utils';

export function getDelegationNetwork(chainId: ChainId) {
  // NOTE: any EVM network can be used for delegation on EVMs (it will switch chainId as needed).
  // This will also support networks that are not supported natively.
  const evmNetwork = enabledNetworks.find(networkId =>
    evmNetworks.includes(networkId)
  );

  const isEvm = typeof chainId === 'number';
  const actionNetwork = isEvm
    ? evmNetwork
    : (Object.entries(METADATA).find(
        ([, metadata]) => metadata.chainId === chainId
      )?.[0] as NetworkID);
  if (!actionNetwork) throw new Error('Failed to detect action network');

  return actionNetwork;
}

export async function splitDelegate(
  space: Space,
  contractAddress: string,
  chainId: ChainId,
  delegatees: string[],
  shares: number[],
  expiration: number
) {
  if (!delegatees.length) {
    return clearSplitDelegate(space, contractAddress, chainId);
  }

  const { auth } = useWeb3();

  if (!auth.value) {
    return;
  }

  await verifyNetwork(auth.value.provider, Number(toValue(chainId)));

  // Assign the remaining shares to the self
  const remainingShares = Math.floor(100 - shares.reduce((a, b) => a + b, 0));
  if (remainingShares > 0) {
    const selfIndex = delegatees.findIndex(
      address => address === auth.value.account
    );
    if (selfIndex !== -1) {
      delegatees.splice(selfIndex, 1);
      shares.splice(selfIndex, 1);
    }
    shares.push(remainingShares);
    delegatees.push(auth.value.account);
  }

  const contract = new Contract(
    contractAddress,
    abis.splitDelegation,
    auth.value.provider.getSigner()
  );

  const delegations = delegatees
    .map((address, index) => ({
      delegate: hexZeroPad(address, 32),
      ratio: shares[index]
    }))
    .sort((a, b) => {
      return BigInt(a.delegate) < BigInt(b.delegate) ? -1 : 1;
    });

  return contract.setDelegation(space.id, delegations, expiration);
}

export async function clearSplitDelegate(
  space: Space,
  contractAddress: string,
  chainId: ChainId
) {
  const { auth } = useWeb3();

  if (!auth.value) {
    return;
  }

  await verifyNetwork(auth.value.provider, Number(toValue(chainId)));

  const contract = new Contract(
    contractAddress,
    abis.splitDelegation,
    auth.value.provider.getSigner()
  );

  return contract.clearDelegation(space.id);
}
