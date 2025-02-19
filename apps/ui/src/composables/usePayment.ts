import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { toUtf8Bytes } from '@ethersproject/strings';
import { abis } from '@/helpers/abis';
import { verifyNetwork } from '@/helpers/utils';
import { ChainId } from '@/types';

export type TokenId = 'USDC' | 'USDT';
export type Token = {
  address: string;
  decimal: number;
  symbol: string;
  chainId: ChainId;
};

// TODO: Double check contract address for each network
const PAYMENT_CONTRACT_ADDRESSES: Record<ChainId, string> = {
  1: '',
  11155111: '0xA92D665c4814c8E1681AaB292BA6d2278D01DEE0',
  8453: '0xA92D665c4814c8E1681AaB292BA6d2278D01DEE0',
  84532: ''
} as const;

const PAYMENT_CONTRACT_ABI = [
  'function payWithERC20Token(address token, uint256 amount, bytes barcode)'
] as const;

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
  },
  84532: {
    USDC: {
      address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      chainId: 84532,
      ...ASSETS['USDC']
    },
    USDT: {
      address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
      chainId: 84532,
      ...ASSETS['USDT']
    }
  }
} as const;

function getWeiAmount(token: Token, amount: number): BigNumber {
  return BigNumber.from(amount * 10 ** token.decimal);
}

export default function usePayment() {
  const { auth } = useWeb3();
  const { modalAccountOpen } = useModal();

  async function hasBalance(token: Token, amount: number): Promise<boolean> {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return false;
    }

    await verifyNetwork(auth.value.provider, Number(token.chainId));

    const signer = auth.value.provider.getSigner();
    const tokenContract = new Contract(token.address, abis.erc20, signer);
    const balance = await tokenContract.balanceOf(signer.getAddress());

    return BigNumber.from(balance).gte(getWeiAmount(token, amount));
  }

  async function hasApproved(token: Token, amount: number): Promise<boolean> {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return false;
    }

    await verifyNetwork(auth.value.provider, Number(token.chainId));

    const signer = auth.value.provider.getSigner();
    const tokenContract = new Contract(token.address, abis.erc20, signer);
    const allowance = await tokenContract.allowance(
      signer.getAddress(),
      PAYMENT_CONTRACT_ADDRESSES[token.chainId]
    );

    return BigNumber.from(allowance).gte(getWeiAmount(token, amount));
  }

  async function approve(token: Token, amount: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return false;
    }

    await verifyNetwork(auth.value.provider, Number(token.chainId));

    const tokenContract = new Contract(
      token.address,
      abis.erc20,
      auth.value.provider.getSigner()
    );

    return tokenContract.approve(
      PAYMENT_CONTRACT_ADDRESSES[token.chainId],
      getWeiAmount(token, amount)
    );
  }

  async function pay(token: Token, amount: number, barcode: string) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return false;
    }

    await verifyNetwork(auth.value.provider, Number(token.chainId));

    const paymentContract = new Contract(
      PAYMENT_CONTRACT_ADDRESSES[token.chainId],
      PAYMENT_CONTRACT_ABI,
      auth.value.provider.getSigner()
    );

    return paymentContract.payWithERC20Token(
      token.address,
      getWeiAmount(token, amount),
      toUtf8Bytes(barcode)
    );
  }

  return {
    hasBalance,
    hasApproved,
    approve,
    pay
  };
}
