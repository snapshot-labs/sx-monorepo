import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { toUtf8Bytes } from '@ethersproject/strings';
import { abis } from '@/helpers/abis';
import { ChainId } from '@/types';

export type TokenId = 'USDC' | 'USDT';
export type Token = {
  address: string;
  decimal: number;
  symbol: string;
  chainId: ChainId;
};

const PAYMENT_CONTRACT_ADDRESS = '0xA92D665c4814c8E1681AaB292BA6d2278D01DEE0';

const PAYMENT_CONTRACT_ABI = [
  'function payWithERC20Token(address token, uint256 amount, bytes barcode)'
];

export const ASSETS = {
  USDC: {
    decimal: 6,
    symbol: 'USDC'
  },
  USDT: {
    decimal: 6,
    symbol: 'USDT'
  }
} as const;

// TODO: Double check contract addresses for each token
export const TOKENS: Record<ChainId, Record<TokenId, Token>> = {
  11155111: {
    USDC: {
      address: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
      chainId: 11155111,
      ...ASSETS['USDC']
    },
    USDT: {
      address: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0',
      chainId: 11155111,
      ...ASSETS['USDT']
    }
  },
  1: {
    USDC: {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      chainId: 1,
      ...ASSETS['USDC']
    },
    USDT: {
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      chainId: 1,
      ...ASSETS['USDT']
    }
  },
  8453: {
    USDC: {
      address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      chainId: 8453,
      ...ASSETS['USDC']
    },
    USDT: {
      address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
      chainId: 8453,
      ...ASSETS['USDT']
    }
  }
} as const;

export default function usePayment(token: Token, web3: Web3Provider) {
  function getWeiAmount(amount: number): BigNumber {
    return BigNumber.from(amount * 10 ** token.decimal);
  }

  const tokenContract = new Contract(
    token.address,
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
      token.address,
      getWeiAmount(amount),
      toUtf8Bytes(barcode)
    );
  }

  return { hasBalance, hasApproved, approve, pay };
}
