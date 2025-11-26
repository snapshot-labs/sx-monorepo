import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { JsonRpcSigner } from '@ethersproject/providers';
import { abis } from '@/helpers/abis';

export type Token = {
  contractAddress: string;
  decimals: number;
  symbol: string;
};

export async function getIsApproved(
  token: Token,
  signer: JsonRpcSigner,
  spenderAddress: string,
  amount: number
): Promise<boolean> {
  const contract = new Contract(token.contractAddress, abis.erc20, signer);
  const allowance = await contract.allowance(
    await signer.getAddress(),
    spenderAddress
  );

  return BigNumber.from(allowance).gte(
    BigNumber.from(Math.floor(amount * 10 ** token.decimals))
  );
}

export async function approve(
  token: Token,
  signer: JsonRpcSigner,
  spenderAddress: string,
  amount: number
) {
  const contract = new Contract(token.contractAddress, abis.erc20, signer);
  return contract.approve(
    spenderAddress,
    BigNumber.from(Math.floor(amount * 10 ** token.decimals))
  );
}
