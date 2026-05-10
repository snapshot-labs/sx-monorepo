import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { MaybeRefOrGetter } from 'vue';
import { abis } from '@/helpers/abis';
import {
  Eip5792Call,
  hasAtomicBatchSupport,
  sendBatchedCalls,
  waitForCallsBundle
} from '@/helpers/eip5792';
import { approve as approveToken, getTokenAllowance } from '@/helpers/token';
import { verifyNetwork } from '@/helpers/walletNetworks';
import { ChainId } from '@/types';

export type Token = {
  contractAddress: string;
  decimals: number;
  symbol: string;
};

const PAYMENT_CONTRACT_ADDRESSES: Record<ChainId, string> = {
  1: '0xE40BfEB5a3014c9b98597088cA71eccdc27Ca410',
  11155111: '0xE40BfEB5a3014c9b98597088cA71eccdc27Ca410'
} as const;

const PAYMENT_CONTRACT_ABI = [
  'function payWithERC20Token(address token, uint256 amount, string barcode)'
] as const;

export const TOKENS: Record<ChainId, Token[]> = {
  11155111: [
    {
      contractAddress: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
      decimals: 6,
      symbol: 'USDC'
    },
    {
      contractAddress: '0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0',
      decimals: 6,
      symbol: 'USDT'
    },
    {
      contractAddress: '0x8ec1409bf214893aea175c9c00c711593277f1c3',
      decimals: 6,
      symbol: 'SNUSDC'
    }
  ],
  1: [
    {
      contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      decimals: 6,
      symbol: 'USDC'
    },
    {
      contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      decimals: 6,
      symbol: 'USDT'
    }
  ]
} as const;

function getWeiAmount(token: Token, amount: number): bigint {
  return BigNumber.from(amount * 10 ** token.decimals).toBigInt();
}

export default function usePayment(network: MaybeRefOrGetter<ChainId>) {
  const { auth } = useWeb3();
  const { modalAccountOpen } = useModal();
  const abortController = new AbortController();
  onScopeDispose(() => abortController.abort());

  async function getIsApproved(
    token: Token,
    amount: number
  ): Promise<boolean | undefined> {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return;
    }

    await verifyNetwork(auth.value.provider, Number(toValue(network)));

    const allowance = await getTokenAllowance(
      auth.value!.provider,
      token.contractAddress,
      PAYMENT_CONTRACT_ADDRESSES[toValue(network)]
    );

    return allowance >= getWeiAmount(token, amount);
  }

  async function approve(token: Token, amount: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return;
    }

    await verifyNetwork(auth.value.provider, Number(toValue(network)));

    return approveToken(
      auth.value!.provider,
      token.contractAddress,
      PAYMENT_CONTRACT_ADDRESSES[toValue(network)],
      getWeiAmount(token, amount)
    );
  }

  async function pay(token: Token, amount: number, barcode: string) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return;
    }

    await verifyNetwork(auth.value.provider, Number(toValue(network)));

    const paymentContract = new Contract(
      PAYMENT_CONTRACT_ADDRESSES[toValue(network)],
      PAYMENT_CONTRACT_ABI,
      auth.value.provider.getSigner()
    );

    return paymentContract.payWithERC20Token(
      token.contractAddress,
      getWeiAmount(token, amount),
      barcode
    );
  }

  async function getHasBatchSupport(): Promise<boolean> {
    if (!auth.value) return false;

    return hasAtomicBatchSupport(
      auth.value.provider,
      auth.value.account,
      Number(toValue(network))
    );
  }

  async function batchedApproveAndPay(
    token: Token,
    amount: number,
    barcode: string
  ) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return;
    }

    await verifyNetwork(auth.value.provider, Number(toValue(network)));

    const spender = PAYMENT_CONTRACT_ADDRESSES[toValue(network)];
    const weiAmount = getWeiAmount(token, amount);

    const erc20 = new Interface(abis.erc20);
    const payment = new Interface(PAYMENT_CONTRACT_ABI);

    const calls: Eip5792Call[] = [
      {
        to: token.contractAddress,
        data: erc20.encodeFunctionData('approve', [spender, weiAmount])
      },
      {
        to: spender,
        data: payment.encodeFunctionData('payWithERC20Token', [
          token.contractAddress,
          weiAmount,
          barcode
        ])
      }
    ];

    const bundleId = await sendBatchedCalls(
      auth.value.provider,
      auth.value.account,
      Number(toValue(network)),
      calls
    );

    const hash = await waitForCallsBundle(auth.value.provider, bundleId, {
      signal: abortController.signal
    });

    return { hash };
  }

  return {
    getIsApproved,
    getHasBatchSupport,
    approve,
    pay,
    batchedApproveAndPay
  };
}
