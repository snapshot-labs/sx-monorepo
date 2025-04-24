import { Interface } from '@ethersproject/abi';
import { parseUnits } from '@ethersproject/units';
import { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding/execution-hash';
import { Nft } from '@/composables/useNfts';
import { abis } from '@/helpers/abis';
import { Token } from '@/helpers/alchemy';
import { resolver } from '@/helpers/resolver';
import { getSalt } from '@/helpers/utils';
import {
  ContractCallTransaction,
  SendNftTransaction,
  SendTokenTransaction,
  StakeTokenTransaction,
  Transaction
} from '@/types';

export async function createSendTokenTransaction({
  token,
  form
}: {
  token: Token;
  form: any;
}): Promise<SendTokenTransaction> {
  const baseAmount = parseUnits(form.amount.toString(), token.decimals);

  const isEth =
    token.contractAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

  let recipientAddress = form.to;
  const resolvedTo = await resolver.resolveName(form.to);
  if (resolvedTo?.address) recipientAddress = resolvedTo.address;

  let data = '0x';
  if (!isEth) {
    const iface = new Interface(abis.erc20);
    data = iface.encodeFunctionData('transfer', [recipientAddress, baseAmount]);
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
    to: isEth ? recipientAddress : token.contractAddress,
    data,
    value: isEth ? baseAmount.toString() : '0',
    salt: getSalt()
  };
}

export async function createSendNftTransaction({
  nft,
  address,
  form
}: {
  nft: Pick<
    Nft,
    'type' | 'contractAddress' | 'tokenId' | 'title' | 'collectionName'
  >;
  address: string;
  form: {
    to: string;
    amount: string | number;
  };
}): Promise<SendNftTransaction> {
  let data = '';

  const baseAmount = parseUnits(form.amount.toString() || '1', 0);

  let recipientAddress = form.to;
  const resolvedTo = await resolver.resolveName(form.to);
  if (resolvedTo?.address) recipientAddress = resolvedTo.address;

  if (nft.type === 'erc1155') {
    const iface = new Interface(abis.erc1155);

    data = iface.encodeFunctionData('safeTransferFrom', [
      address,
      recipientAddress,
      nft.tokenId,
      baseAmount,
      0
    ]);
  } else if (nft.type === 'erc721') {
    const iface = new Interface(abis.erc721);

    data = iface.encodeFunctionData('safeTransferFrom', [
      address,
      recipientAddress,
      nft.tokenId
    ]);
  }

  return {
    _type: 'sendNft',
    _form: {
      recipient: form.to,
      sender: address,
      amount: baseAmount.toString(),
      nft: {
        type: nft.type,
        address: nft.contractAddress,
        id: nft.tokenId,
        name: nft.title,
        collection: nft.collectionName
      }
    },
    to: nft.contractAddress,
    data,
    value: '0',
    salt: getSalt()
  };
}

export async function createContractCallTransaction({
  form
}): Promise<ContractCallTransaction> {
  let args: any[] = Object.values(form.args);

  let recipientAddress = form.to;
  const resolvedTo = await resolver.resolveName(form.to);
  if (resolvedTo?.address) recipientAddress = resolvedTo.address;

  const iface = new Interface(form.abi);

  const methodAbi = iface.functions[form.method];

  if (methodAbi) {
    // Send in same order as the ABI
    args = methodAbi.inputs.map(({ name }) => {
      return form.args[name];
    });

    await Promise.all(
      methodAbi.inputs.map(async (input, i) => {
        if (input.type === 'address') {
          const resolved = await resolver.resolveName(args[i]);
          if (resolved?.address) args[i] = resolved.address;
        } else if (input.type.endsWith('[]')) {
          args[i] = args[i].split(',').map(value => value.trim());
        }
      })
    );
  }

  const data = iface.encodeFunctionData(form.method, args as any);

  return {
    _type: 'contractCall',
    to: recipientAddress,
    data,
    value: iface.getFunction(form.method).payable
      ? parseUnits(form.amount.toString(), 18).toString()
      : '0',
    salt: getSalt(),
    _form: {
      abi: form.abi,
      recipient: form.to,
      method: form.method,
      args: form.args,
      amount: form.amount
    }
  };
}

export async function createStakeTokenTransaction({
  form
}): Promise<StakeTokenTransaction> {
  let contractAddress = form.to;
  const resolvedTo = await resolver.resolveName(form.to);
  if (resolvedTo?.address) contractAddress = resolvedTo.address;

  let referralAddress = form.args.referral;
  const resolvedReferral = await resolver.resolveName(form.args.referral);
  if (resolvedReferral?.address) referralAddress = resolvedReferral.address;

  const abi = [
    'function submit(address _referral) external payable returns (uint256)'
  ];
  const iface = new Interface(abi);
  const data = iface.encodeFunctionData('submit', [referralAddress]);

  return {
    _type: 'stakeToken',
    to: contractAddress,
    data,
    value: parseUnits(form.amount.toString(), 18).toString(),
    salt: getSalt(),
    _form: {
      recipient: form.to,
      args: form.args,
      amount: form.amount
    }
  };
}

export function convertToMetaTransactions(
  transactions: Transaction[]
): MetaTransaction[] {
  return transactions.map((tx: Transaction) => ({
    ...tx,
    operation: 0,
    salt: BigInt(tx.salt)
  }));
}
