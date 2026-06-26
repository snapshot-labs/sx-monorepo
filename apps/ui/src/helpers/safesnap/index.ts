import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { hexConcat, hexZeroPad } from '@ethersproject/bytes';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { keccak256 } from '@ethersproject/keccak256';
import { Transaction } from '@snapshot-labs/sx';
import {
  SafeSnapTransaction,
  serializeSafeSnapTransaction
} from './transactions';

export { parseSafeSnapTransaction } from './transactions';

// Canonical Safe MultiSendCallOnly v1.3.0 (same address on every supported chain).
const MULTI_SEND_ADDRESS = '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761';
const MULTI_SEND_ABI = ['function multiSend(bytes transactions)'];

// Reality module EIP-712 transaction type (domain has no name/version/salt).
const EIP712_TRANSACTION_TYPE = {
  Transaction: [
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'operation', type: 'uint8' },
    { name: 'nonce', type: 'uint256' }
  ]
};

type ModuleTransaction = {
  to: string;
  value: string;
  data: string;
  operation: string;
  nonce: string;
};

export type SafeSnapExecutionData = {
  network: string;
  realityAddress: string;
  multiSendAddress: string;
  hash: string;
  txs: {
    hash: string;
    nonce: number;
    mainTransaction: ModuleTransaction;
    transactions: SafeSnapTransaction[];
  }[];
};

function byteLength(data: string) {
  return data && data !== '0x' ? (data.length - 2) / 2 : 0;
}

// Solidity-packed encoding of the MultiSend transactions blob.
function encodeMultiSend(transactions: SafeSnapTransaction[]) {
  const packed = hexConcat(
    transactions.map(tx => {
      const data = tx.data || '0x';
      return hexConcat([
        hexZeroPad(BigNumber.from(tx.operation || '0').toHexString(), 1),
        hexZeroPad(tx.to, 20),
        hexZeroPad(BigNumber.from(tx.value || '0').toHexString(), 32),
        hexZeroPad(BigNumber.from(byteLength(data)).toHexString(), 32),
        data
      ]);
    })
  );

  return new Interface(MULTI_SEND_ABI).encodeFunctionData('multiSend', [
    packed
  ]);
}

// Collapse a batch into the single transaction submitted to the module:
// passthrough for one transaction, MultiSend delegatecall for several.
function getMainTransaction(
  transactions: SafeSnapTransaction[]
): ModuleTransaction {
  if (transactions.length === 1) {
    const [tx] = transactions;
    return {
      to: tx.to,
      value: tx.value || '0',
      data: tx.data || '0x',
      operation: tx.operation || '0',
      nonce: '0'
    };
  }

  return {
    to: MULTI_SEND_ADDRESS,
    value: '0',
    data: encodeMultiSend(transactions),
    operation: '1',
    nonce: '0'
  };
}

function calcTransactionHash(
  chainId: number,
  module: string,
  transaction: ModuleTransaction
) {
  return _TypedDataEncoder.hash(
    { chainId, verifyingContract: module },
    EIP712_TRANSACTION_TYPE,
    transaction
  );
}

// Build a single-batch SafeSnap safe payload (Reality module) for a proposal's
// plugins.safeSnap.safes array, with the batch hash the module checks on execution.
export function createSafeSnapExecution(
  chainId: number,
  realityAddress: string,
  transactions: Transaction[]
): SafeSnapExecutionData {
  const serialized = transactions.map(serializeSafeSnapTransaction);
  const mainTransaction = getMainTransaction(serialized);
  const hash = calcTransactionHash(chainId, realityAddress, mainTransaction);

  return {
    network: String(chainId),
    realityAddress,
    multiSendAddress: MULTI_SEND_ADDRESS,
    hash: keccak256(hexConcat([hash])),
    txs: [{ hash, nonce: 0, mainTransaction, transactions: serialized }]
  };
}
