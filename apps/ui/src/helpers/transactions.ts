import { Interface } from '@ethersproject/abi';
import { parseUnits } from '@ethersproject/units';
import { abis } from '@/helpers/abis';
import type { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import type { Token } from '@/helpers/alchemy';
import type {
  SendTokenTransaction,
  SendNftTransaction,
  ContractCallTransaction,
  Transaction
} from '@/types';

export function createSendTokenTransaction({
  token,
  form
}: {
  token: Token;
  form: any;
}): SendTokenTransaction {
  const baseAmount = parseUnits(form.amount.toString(), token.decimals);

  const isEth = token.contractAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

  let data = '0x';
  if (!isEth) {
    const iface = new Interface(abis.erc20);
    data = iface.encodeFunctionData('transfer', [form.to, baseAmount]);
  }

  return {
    _type: 'sendToken',
    _form: {
      recipient: form.to,
      token: {
        name: token.name,
        decimals: token.decimals,
        symbol: token.symbol,
        address: token.contractAddress
      },
      amount: baseAmount.toString()
    },
    to: isEth ? form.to : token.contractAddress,
    data,
    value: isEth ? baseAmount.toString() : '0'
  };
}

export function createSendNftTransaction({ nft, address, form }): SendNftTransaction {
  let data = '';

  const baseAmount = parseUnits(form.amount.toString() || '1', 0);

  if (nft.type === 'erc1155') {
    const iface = new Interface(abis.erc1155);

    data = iface.encodeFunctionData('safeTransferFrom', [
      address,
      form.to,
      nft.tokenId,
      baseAmount,
      0
    ]);
  } else if (nft.type === 'erc721') {
    const iface = new Interface(abis.erc721);

    data = iface.encodeFunctionData('safeTransferFrom', [address, form.to, nft.tokenId]);
  }

  return {
    _type: 'sendNft',
    _form: {
      recipient: form.to,
      amount: baseAmount.toString(),
      nft: {
        address: nft.contractAddress,
        id: nft.tokenId,
        name: nft.title,
        collection: nft.collectionName
      }
    },
    to: nft.contractAddress,
    data,
    value: '0'
  };
}

export function createContractCallTransaction({ form }): ContractCallTransaction {
  const args = Object.values(form.args);

  const iface = new Interface(form.abi);
  const data = iface.encodeFunctionData(form.method, args);

  return {
    _type: 'contractCall',
    to: form.to,
    data,
    value: iface.getFunction(form.method).payable
      ? parseUnits(form.amount.toString(), 18).toString()
      : '0',
    _form: {
      abi: form.abi,
      recipient: form.to,
      method: form.method,
      args: form.args,
      amount: form.amount
    }
  };
}

export function convertToMetaTransactions(transactions: Transaction[]): MetaTransaction[] {
  return transactions.map((tx: Transaction) => ({
    ...tx,
    nonce: 0,
    operation: 0
  }));
}
