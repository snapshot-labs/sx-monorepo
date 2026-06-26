import { Interface, JsonFragment } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import {
  ContractCallTransaction,
  RawTransaction,
  Transaction
} from '@snapshot-labs/sx';
import { abis } from '@/helpers/abis';
import { getABI } from '@/helpers/etherscan';
import { getSalt } from '@/helpers/utils';
import { BatchFile, BatchTransaction, ContractMethod } from './types';

// An editor transaction that may run as a delegatecall (Safe operation 1),
// e.g. a 1inch Fusion swap. operation is undefined for a regular call.
export type ImportedTransaction = Transaction & { operation?: string };

// A Safe Transaction Builder transaction that may also carry an operation
// (1 = delegatecall), as emitted by the Fusion order builder.
type ImportTransaction = BatchTransaction & { operation?: string | number };

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
        args: Object.fromEntries(
          parsed.functionFragment.inputs.map((input, i) => [
            input.name,
            String(parsed.args[i])
          ])
        ),
        amount: ''
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
          `${method.name}(${inputs.map(input => input.type).join(',')})`,
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
  tx: ImportTransaction,
  chainId?: string
): Promise<ImportedTransaction> {
  const transaction =
    (tx.contractMethod && fromContractMethod(tx, tx.contractMethod)) ||
    (await decode(tx, chainId)) ||
    toRaw(tx);

  // Preserve delegatecall transactions (operation 1); a call is the default.
  return String(tx.operation) === '1'
    ? { ...transaction, operation: '1' }
    : transaction;
}

// Parse a Safe Transaction Builder export into editor transactions. A
// transaction may carry an `operation` (1 = delegatecall, e.g. a Fusion swap),
// which the Transaction Builder standard omits but SafeSnap supports.
export async function parseSafeImportFile(
  content: string,
  chainId?: string
): Promise<ImportedTransaction[]> {
  const file = JSON.parse(content) as Partial<BatchFile>;

  if (!Array.isArray(file.transactions) || !file.transactions.length) {
    throw new Error('No transactions found in file');
  }

  if (chainId && file.chainId && String(file.chainId) !== chainId) {
    throw new Error(`This file is for chain ${file.chainId}, not ${chainId}`);
  }

  return Promise.all(
    file.transactions.map(tx => parseSafeTransaction(tx, chainId))
  );
}
