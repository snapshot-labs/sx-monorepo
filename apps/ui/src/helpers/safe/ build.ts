import { FormatTypes, Interface, JsonFragment } from '@ethersproject/abi';
import { Transaction } from '@/types';
import { addChecksum } from './checksum';
import { BatchFile, BatchTransaction } from './types';
import { ETH_CONTRACT } from '../constants';

export function buildBatchFile(
  chainId: number,
  transactions: Transaction[]
): BatchFile {
  const batchFile = {
    version: '1.0',
    chainId: chainId.toString(),
    createdAt: Date.now(),
    meta: {
      name: 'Batch File',
      txBuilderVersion: '1.17.0'
    },
    transactions: transactions.map(tx => {
      const outputTransaction = {
        to: tx.to,
        value: tx.value,
        data: tx.data
      } as BatchTransaction;

      if (tx._type === 'sendToken') {
        const isEth = tx._form.token.address === ETH_CONTRACT;
        if (isEth) return outputTransaction;

        outputTransaction.contractMethod = {
          inputs: [
            { internalType: 'address', name: 'recipient', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' }
          ],
          name: 'transfer',
          payable: false
        };
        outputTransaction.contractInputsValues = {
          recipient: tx._form.recipient,
          amount: tx._form.amount
        };
        delete outputTransaction.data;
      } else if (tx._type === 'sendNft') {
        if (tx._form.nft.type === 'erc721') {
          outputTransaction.contractMethod = {
            inputs: [
              { internalType: 'address', name: 'from', type: 'address' },
              { internalType: 'address', name: 'to', type: 'address' },
              { internalType: 'uint256', name: 'tokenId', type: 'uint256' }
            ],
            name: 'safeTransferFrom',
            payable: false
          };
          outputTransaction.contractInputsValues = {
            from: tx._form.sender,
            to: tx._form.recipient,
            tokenId: tx._form.nft.id
          };
        } else if (tx._form.nft.type === 'erc1155') {
          outputTransaction.contractMethod = {
            inputs: [
              { internalType: 'address', name: 'from', type: 'address' },
              { internalType: 'address', name: 'to', type: 'address' },
              { internalType: 'uint256', name: 'id', type: 'uint256' },
              { internalType: 'uint256', name: 'amount', type: 'uint256' },
              { internalType: 'bytes', name: 'data', type: 'bytes' }
            ],
            name: 'safeTransferFrom',
            payable: false
          };
          outputTransaction.contractInputsValues = {
            from: tx._form.sender,
            to: tx._form.recipient,
            id: tx._form.nft.id,
            amount: tx._form.amount,
            data: '0x'
          };
        }

        delete outputTransaction.data;
      } else if (tx._type === 'stakeToken') {
        outputTransaction.contractMethod = {
          inputs: [
            { internalType: 'address', name: '_referral', type: 'address' }
          ],
          name: 'submit',
          payable: true
        };
        outputTransaction.contractInputsValues = {
          _referral: tx._form.args.referral
        };
        delete outputTransaction.data;
      } else if (tx._type === 'contractCall') {
        const iface = new Interface(tx._form.abi);
        const jsonAbi = iface.format(FormatTypes.json);
        if (Array.isArray(jsonAbi)) throw new Error('Invalid ABI');

        const rawMethodName = tx._form.method.slice(
          0,
          tx._form.method.indexOf('(')
        );
        const method = JSON.parse(jsonAbi).find(
          (fragment: JsonFragment) => fragment.name === rawMethodName
        );

        outputTransaction.contractMethod = {
          inputs: method.inputs,
          name: method.name,
          payable: method.payable
        };
        outputTransaction.contractInputsValues = tx._form.args;
        delete outputTransaction.data;
      }

      return outputTransaction;
    })
  };

  return addChecksum(batchFile);
}
