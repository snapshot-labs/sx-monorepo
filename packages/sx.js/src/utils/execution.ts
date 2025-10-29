import { Fragment, Interface, JsonFragment } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import {
  ContractCallTransaction,
  SendTokenTransaction,
  Transaction
} from '../types';

type Abi = (Fragment | JsonFragment | string)[];

type CallInfo = {
  target: `0x${string}`;
  calldata: `0x${string}` | '';
  value: string;
};

const ABI_CACHE = new Map<`${number}:0x${string}`, Abi>();
const CUSTOM_PROXY_RESOLVERS = {
  // Compound Governor Bravo
  // Unitroller proxy pattern (implementation available at comptrollerImplementation)
  '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B': async (
    address: `0x${string}`,
    provider: StaticJsonRpcProvider
  ) => {
    const contract = new Contract(
      address,
      ['function comptrollerImplementation() view returns (address)'],
      provider
    );

    return contract.comptrollerImplementation() as Promise<`0x${string}`>;
  },
  '0xc0Da02939E1441F497fd74F78cE7Decb17B66529': async (
    address: `0x${string}`,
    provider: StaticJsonRpcProvider
  ) => {
    const contract = new Contract(
      address,
      ['function implementation() view returns (address)'],
      provider
    );

    return contract.implementation() as Promise<`0x${string}`>;
  }
} as const;

export async function getAbi(
  chainId: number,
  address: `0x${string}`
): Promise<Abi> {
  const cachedAbi = ABI_CACHE.get(`${chainId}:${address}`);

  if (cachedAbi) {
    return cachedAbi;
  }

  if (address in CUSTOM_PROXY_RESOLVERS) {
    const resolver =
      CUSTOM_PROXY_RESOLVERS[address as keyof typeof CUSTOM_PROXY_RESOLVERS];

    const provider = new StaticJsonRpcProvider(
      `https://rpc.snapshot.org/${chainId}`,
      chainId
    );

    const implementationAddress = await resolver(address, provider);

    return getAbi(chainId, implementationAddress);
  }

  const res = await fetch(
    `https://sourcify.dev/server/v2/contract/${chainId}/${address}?fields=abi,proxyResolution`
  );

  if (!res.ok) {
    throw new Error('Failed to fetch ABI from Sourcify');
  }

  const { abi, proxyResolution } = await res.json();

  if (!proxyResolution.isProxy) {
    ABI_CACHE.set(`${chainId}:${address}`, abi);

    return abi;
  }

  return getAbi(chainId, proxyResolution.implementations[0].address);
}

export async function createSendTokenTransaction(
  data: CallInfo,
  amount: string,
  token: SendTokenTransaction['_form']['token']
): Promise<SendTokenTransaction> {
  return {
    _type: 'sendToken',
    _form: {
      recipient: data.target,
      token,
      amount
    },
    to: data.target,
    data: data.calldata,
    value: data.value,
    salt: '0'
  };
}

export async function decodeExecution(
  abi: Abi,
  data: CallInfo,
  chainId: number
): Promise<ContractCallTransaction | SendTokenTransaction | null> {
  const { target, calldata, value } = data;

  const iface = new Interface(abi);
  try {
    const functionFragment = iface.getFunction(calldata.slice(0, 10));
    const decoded = iface.decodeFunctionData(functionFragment, calldata);

    const isErc20Transfer =
      functionFragment.name === 'transfer' &&
      functionFragment.inputs.length === 2 &&
      functionFragment.inputs[0]?.type === 'address' &&
      functionFragment.inputs[1]?.type === 'uint256';

    if (isErc20Transfer) {
      const provider = new StaticJsonRpcProvider(
        `https://rpc.snapshot.org/${chainId}`,
        chainId
      );

      const tokenContract = new Contract(target, abi, provider);

      const [name, symbol, decimals]: [string, string, number] =
        await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.decimals()
        ]);

      return createSendTokenTransaction(data, decoded[1].toString(), {
        name,
        symbol,
        decimals,
        address: target
      });
    }

    return {
      _type: 'contractCall',
      to: target,
      data: calldata,
      value,
      salt: '0',
      _form: {
        abi,
        recipient: target,
        method: functionFragment.format(),
        args: Object.fromEntries(
          functionFragment.inputs.map((input, index) => [
            input.name,
            BigNumber.isBigNumber(decoded[index])
              ? decoded[index].toString()
              : decoded[index]
          ])
        ),
        amount: value
      }
    };
  } catch {
    return null;
  }
}

export async function convertToTransaction(
  data: CallInfo,
  chainId: number
): Promise<Transaction> {
  if (data.calldata === '0x') {
    return createSendTokenTransaction(data, data.value, {
      name: 'Ethereum',
      decimals: 18,
      symbol: 'ETH',
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    });
  }

  try {
    const contractAbi = await getAbi(chainId, data.target);
    const decodedExecution = await decodeExecution(contractAbi, data, chainId);

    if (decodedExecution) {
      return decodedExecution;
    }
  } catch {}

  return {
    _type: 'raw',
    _form: {
      recipient: data.target
    },
    to: data.target,
    data: data.calldata,
    value: data.value,
    salt: '0'
  };
}
