import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { parseUnits as _parseUnits } from '@ethersproject/units';
import { abis } from '@/helpers/abis';

export async function getTokenAllowance(
  web3: Web3Provider,
  tokenAddress: string,
  spenderAddress: string
): Promise<bigint> {
  const signer = web3.getSigner();
  const contract = new Contract(tokenAddress, abis.erc20, signer);

  const allowance = await contract.allowance(
    await signer.getAddress(),
    spenderAddress
  );

  return allowance.toBigInt();
}

export async function approve(
  web3: Web3Provider,
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint
) {
  const contract = new Contract(tokenAddress, abis.erc20, web3.getSigner());

  return contract.approve(spenderAddress, amount);
}

export function parseUnits(value: string, decimals: number): bigint {
  return _parseUnits(value, decimals).toBigInt();
}
