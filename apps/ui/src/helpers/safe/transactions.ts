import { Interface, JsonFragment } from '@ethersproject/abi';
import { isAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { formatUnits } from '@ethersproject/units';
import {
  ContractCallTransaction,
  RawTransaction,
  Transaction
} from '@snapshot-labs/sx';
import { abis } from '@/helpers/abis';
import { getABI } from '@/helpers/etherscan';
import { getContractCallFormArgs } from '@/helpers/transactions';
import { getSalt } from '@/helpers/utils';
import { validateChecksum } from './checksum';
import { BatchFile, BatchTransaction, ContractMethod } from './types';

function parseValue(value?: string | null): string {
  return value ? BigNumber.from(value).toString() : '0';
}

// Safe stores every input value as a string; coerce the ones ethers can't.
function parseArg(type: string, value: string) {
  if (type.endsWith(']') || type.startsWith('tuple')) return JSON.parse(value);
  if (type === 'bool') return value === 'true';
  return value;
}

function toRaw(tx: BatchTransaction): RawTransaction {
  return {
    _type: 'raw',
    to: tx.to,
    data: tx.data || '0x',
    value: parseValue(tx.value),
    salt: getSalt(),
    _form: { recipient: tx.to }
  };
}

// The single builder for every contract call: decode the calldata with an ABI,
// or return null when it doesn't match.
function decodeWithAbi(
  tx: BatchTransaction,
  abi: any[]
): ContractCallTransaction | null {
  try {
    const parsed = new Interface(abi).parseTransaction({ data: tx.data! });

    return {
      _type: 'contractCall',
      to: tx.to,
      data: tx.data!,
      value: parseValue(tx.value),
      salt: getSalt(),
      _form: {
        abi,
        recipient: tx.to,
        method: parsed.signature,
        args: getContractCallFormArgs({
          abi,
          method: parsed.signature,
          args: Object.fromEntries(
            parsed.functionFragment.inputs.map((input, i) => [
              input.name,
              parsed.args[i]
            ])
          )
        }),
        amount: parsed.functionFragment.payable
          ? formatUnits(parseValue(tx.value), 18)
          : ''
      }
    };
  } catch {
    return null;
  }
}

// A Safe Transaction Builder transaction carries the method and inputs; build
// its ABI, encode the calldata when the file omits it, then decode uniformly.
function fromContractMethod(
  tx: BatchTransaction,
  method: ContractMethod
): ContractCallTransaction | null {
  const inputs = method.inputs ?? [];
  const abi: JsonFragment[] = [
    {
      name: method.name,
      type: 'function',
      stateMutability: method.payable ? 'payable' : 'nonpayable',
      inputs,
      outputs: []
    }
  ];

  const data =
    tx.data && tx.data !== '0x'
      ? tx.data
      : new Interface(abi).encodeFunctionData(
          method.name,
          inputs.map(input =>
            parseArg(input.type, (tx.contractInputsValues ?? {})[input.name])
          )
        );

  return decodeWithAbi({ ...tx, data }, abi);
}

// Decode raw calldata by fetching the contract ABI (Etherscan, with proxy
// resolution), then standard token ABIs (covers proxies like USDC whose
// implementation can't be resolved).
async function decode(
  tx: BatchTransaction,
  chainId?: string
): Promise<ContractCallTransaction | null> {
  if (!chainId || !tx.data || tx.data === '0x') return null;

  const candidates: any[] = [abis.erc20, abis.erc721];
  try {
    candidates.unshift(await getABI(Number(chainId), tx.to));
  } catch {
    // No verified ABI; standard token ABIs still cover common calls.
  }

  for (const abi of candidates) {
    const decoded = decodeWithAbi(tx, abi);
    if (decoded) return decoded;
  }

  return null;
}

async function parseSafeTransaction(
  tx: BatchTransaction,
  chainId?: string
): Promise<Transaction> {
  return (
    (tx.contractMethod && fromContractMethod(tx, tx.contractMethod)) ||
    (await decode(tx, chainId)) ||
    toRaw(tx)
  );
}

// Parse a Safe Transaction Builder export into editor transactions.
export async function parseSafeImportFile(
  content: string,
  chainId?: string
): Promise<Transaction[]> {
  const file = JSON.parse(content) as Partial<BatchFile>;

  if (!Array.isArray(file.transactions) || !file.transactions.length) {
    throw new Error('No transactions found in file');
  }

  if (chainId) {
    // Safe writes chainId: chainInfo?.chainId || '' — an empty/missing value
    // must not be treated as a match, or a file with no chain info would
    // import into any treasury regardless of network.
    const fileChainId = file.chainId ? String(file.chainId) : null;
    if (fileChainId !== chainId) {
      throw new Error(
        fileChainId
          ? `This file is for chain ${fileChainId}, not ${chainId}`
          : `This file does not specify a chain; refusing to import into chain ${chainId}`
      );
    }
  }

  const expectedChecksum = file.meta?.checksum;
  if (
    expectedChecksum &&
    // validateChecksum deletes meta.checksum off a shallow copy, which
    // mutates the shared meta object; pass a clone so `file` is untouched.
    !validateChecksum(
      JSON.parse(JSON.stringify(file)) as BatchFile,
      expectedChecksum
    )
  ) {
    throw new Error('This file has an invalid checksum and may be corrupted');
  }

  file.transactions.forEach((tx, i) => {
    if (!isAddress(tx.to)) {
      throw new Error(`Transaction ${i + 1} has an invalid recipient address`);
    }
  });

  return Promise.all(
    file.transactions.map((tx, i) =>
      parseSafeTransaction(tx, chainId).catch(err => {
        const reason = err instanceof Error ? err.message : String(err);

        throw new Error(`Transaction #${i + 1}: ${reason}`);
      })
    )
  );
}
