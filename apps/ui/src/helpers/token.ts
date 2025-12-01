import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { parseUnits } from '@ethersproject/units';
import { abis } from '@/helpers/abis';

export type Token = {
  contractAddress: string;
  decimals: number;
  symbol: string;
  name?: string;
};

export async function getIsApproved(
  token: Token,
  web3: Web3Provider,
  spenderAddress: string,
  amount: string
): Promise<boolean> {
  const signer = web3.getSigner();
  const contract = new Contract(token.contractAddress, abis.erc20, signer);
  const allowance = await contract.allowance(
    await signer.getAddress(),
    spenderAddress
  );

  return BigNumber.from(allowance).gte(parseUnits(amount, token.decimals));
}

export async function approve(
  token: Token,
  web3: Web3Provider,
  spenderAddress: string,
  amount: string
) {
  const contract = new Contract(
    token.contractAddress,
    abis.erc20,
    web3.getSigner()
  );
  return contract.approve(spenderAddress, parseUnits(amount, token.decimals));
}
