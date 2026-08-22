import { Interface } from '@ethersproject/abi';
import {
  ContractCallTransaction,
  RawTransaction,
  SendNftTransaction,
  SendTokenTransaction,
  Transaction
} from '@snapshot-labs/sx';
import { ETH_CONTRACT } from '../constants';

type SafeSnapBaseTransaction = {
  to: string;
  data: string;
  value: string;
  // Set when writing a proposal (creation), ignored when reading.
  operation?: string;
  nonce?: string;
};

type SafeSnapTransferFundsTransaction = SafeSnapBaseTransaction & {
  type: 'transferFunds';
  recipient: string;
  amount: string;
  token: {
    name: string;
    decimals: number;
    symbol: string;
    address: string;
  };
};

type SafeSnapTransferNFTTransaction = SafeSnapBaseTransaction & {
  type: 'transferNFT';
  recipient: string;
  collectable: {
    address: string;
    id: string;
    name: string;
    tokenName: string;
  };
};

type SafeSnapContractInteractionTransaction = SafeSnapBaseTransaction & {
  type: 'contractInteraction';
  abi: string | any[];
};

type SafeSnapRawTransaction = SafeSnapBaseTransaction & {
  type?: undefined;
};

export type SafeSnapTransaction =
  | SafeSnapTransferFundsTransaction
  | SafeSnapTransferNFTTransaction
  | SafeSnapContractInteractionTransaction
  | SafeSnapRawTransaction;

function parseTransferFunds(
  tx: SafeSnapTransferFundsTransaction
): SendTokenTransaction {
  return {
    to: tx.to,
    data: tx.data,
    value: tx.value,
    salt: '',
    _type: 'sendToken',
    _form: {
      recipient: tx.recipient,
      amount: tx.amount,
      token: {
        name: tx.token.name,
        decimals: tx.token.decimals,
        symbol: tx.token.symbol,
        address: tx.token.address === 'main' ? ETH_CONTRACT : tx.token.address
      }
    }
  };
}

function parseTransferNFT(
  tx: SafeSnapTransferNFTTransaction
): SendNftTransaction {
  return {
    to: tx.to,
    data: tx.data,
    value: tx.value,
    salt: '',
    _type: 'sendNft',
    _form: {
      recipient: tx.recipient,
      sender: '',
      amount: '1',
      nft: {
        type: '',
        address: tx.collectable.address,
        id: tx.collectable.id,
        name: tx.collectable.name,
        collection: tx.collectable.tokenName || ''
      }
    }
  };
}

function parseContractInteraction(
  tx: SafeSnapContractInteractionTransaction
): ContractCallTransaction {
  const abi =
    typeof tx.abi === 'string' ? JSON.parse(tx.abi) : (tx.abi as any[]);

  let methodName = tx.data.slice(0, 10);
  const args: string[] = [];

  try {
    const iface = new Interface(abi);
    const parsed = iface.parseTransaction({ data: tx.data });
    methodName = parsed.signature || methodName;

    for (let i = 0; parsed.args && i < parsed.args.length; i++) {
      args.push(String(parsed.args[i]));
    }
  } catch {
    // keep selector as method name
  }

  return {
    to: tx.to,
    data: tx.data,
    value: tx.value,
    salt: '',
    _type: 'contractCall',
    _form: { recipient: tx.to, method: methodName, args, abi }
  };
}

function parseRaw(tx: SafeSnapBaseTransaction): RawTransaction {
  return {
    to: tx.to,
    data: tx.data,
    value: tx.value,
    salt: '',
    _type: 'raw',
    _form: { recipient: tx.to }
  };
}

export function parseSafeSnapTransaction(tx: SafeSnapTransaction): Transaction {
  switch (tx.type) {
    case 'transferFunds':
      return parseTransferFunds(tx);
    case 'transferNFT':
      return parseTransferNFT(tx);
    case 'contractInteraction':
      return parseContractInteraction(tx);
    default:
      return parseRaw(tx);
  }
}

// Inverse of parseSafeSnapTransaction: turn an editor transaction into a
// SafeSnap module transaction (operation/nonce default to a single batch).
export function serializeSafeSnapTransaction(
  tx: Transaction
): SafeSnapTransaction {
  const base = {
    to: tx.to,
    data: tx.data || '0x',
    value: tx.value || '0',
    operation: '0',
    nonce: '0'
  };

  switch (tx._type) {
    case 'sendToken':
      return {
        ...base,
        type: 'transferFunds',
        recipient: tx._form.recipient,
        amount: tx._form.amount,
        token: {
          name: tx._form.token.name,
          decimals: tx._form.token.decimals,
          symbol: tx._form.token.symbol,
          address:
            tx._form.token.address === ETH_CONTRACT
              ? 'main'
              : tx._form.token.address
        }
      };
    case 'sendNft':
      return {
        ...base,
        type: 'transferNFT',
        recipient: tx._form.recipient,
        collectable: {
          address: tx._form.nft.address,
          id: tx._form.nft.id,
          name: tx._form.nft.name,
          tokenName: tx._form.nft.collection || ''
        }
      };
    case 'contractCall':
      return { ...base, type: 'contractInteraction', abi: tx._form.abi };
    default:
      return base;
  }
}

// Canonical Safe MultiSendCallOnly v1.3.0 (same address on every supported chain).
const MULTI_SEND_ADDRESS = '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761';

export type SafeSnapExecutionData = {
  network: string;
  realityAddress: string;
  multiSendAddress: string;
  txs: SafeSnapTransaction[][];
};

// Build a single-batch SafeSnap (Reality) execution for plugins.safeSnap.safes.
// The batch is stored as a raw transaction array; SafeSnap recomputes the
// MultiSend bundle and execution hash from it when the proposal is executed.
export function createSafeSnapExecution(
  chainId: number,
  realityAddress: string,
  transactions: Transaction[]
): SafeSnapExecutionData {
  return {
    network: String(chainId),
    realityAddress,
    multiSendAddress: MULTI_SEND_ADDRESS,
    txs: [transactions.map(serializeSafeSnapTransaction)]
  };
}
