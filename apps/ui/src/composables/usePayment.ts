import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { formatBytes32String } from '@ethersproject/strings';
import { abis } from '@/helpers/abis';
import { ChainId } from '@/types';

export type TokenId = 'USDC';
type PaymentToken = {
  contractAddress: string;
  decimal: number;
  symbol: string;
};

const PAYMENT_CONTRACT_ADDRESS = '0xA92D665c4814c8E1681AaB292BA6d2278D01DEE0';

const PAYMENT_CONTRACT_ABI = [
  'function payWithERC20Token(address token, uint256 amount, bytes barcode)'
];

export const TOKENS: Record<ChainId, Record<TokenId, PaymentToken>> = {
  11155111: {
    USDC: {
      contractAddress: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
      decimal: 6,
      symbol: 'USDC'
    }
  },
  1: {
    USDC: {
      contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      decimal: 6,
      symbol: 'USDC'
    }
  },
  8453: {
    USDC: {
      contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      decimal: 6,
      symbol: 'USDC'
    }
  }
};

export default function usePayment(token: PaymentToken, web3: Web3Provider) {
  function getWeiAmount(amount: number): BigNumber {
    return BigNumber.from(amount * 10 ** token.decimal);
  }

  const tokenContract = new Contract(
    token.contractAddress,
    abis.erc20,
    web3.getSigner()
  );

  const paymentContract = new Contract(
    PAYMENT_CONTRACT_ADDRESS,
    PAYMENT_CONTRACT_ABI,
    web3.getSigner()
  );

  async function hasBalance(amount: number): Promise<boolean> {
    const balance = await tokenContract.balanceOf(
      web3.getSigner().getAddress()
    );

    return BigNumber.from(balance).gte(getWeiAmount(amount));
  }

  async function hasApproved(amount: number): Promise<boolean> {
    const allowance = await tokenContract.allowance(
      web3.getSigner().getAddress(),
      PAYMENT_CONTRACT_ADDRESS
    );

    return BigNumber.from(allowance).gte(getWeiAmount(amount));
  }

  function approve(amount: number) {
    return tokenContract.approve(
      PAYMENT_CONTRACT_ADDRESS,
      getWeiAmount(amount)
    );
  }

  function pay(amount: number, barcode: string) {
    return paymentContract.payWithERC20Token(
      token.contractAddress,
      getWeiAmount(amount),
      formatBytes32String(barcode)
    );
  }

  return { hasBalance, hasApproved, approve, pay };
}
