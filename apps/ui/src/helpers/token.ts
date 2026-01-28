import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { parseUnits as _parseUnits } from '@ethersproject/units';
import { abis } from '@/helpers/abis';
import { compareAddresses } from './utils';

const WETH_CONTRACTS = [
  // Mainnet WETH
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  // Sepolia WETH
  '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
];

export function isWethContract(address: string) {
  return WETH_CONTRACTS.some(weth => compareAddresses(weth, address));
}

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

export async function deposit(
  web3: Web3Provider,
  tokenAddress: string,
  amount: bigint
) {
  const contract = new Contract(tokenAddress, abis.weth, web3.getSigner());

  return contract.deposit({ value: amount });
}

export function parseUnits(value: string, decimals: number): bigint {
  return _parseUnits(value, decimals).toBigInt();
}
