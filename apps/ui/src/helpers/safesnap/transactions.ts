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
    methodName =
      parsed.functionFragment?.format('sighash') ||
      parsed.signature ||
      methodName;

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
