import { FormatTypes, Interface } from '@ethersproject/abi';
import { Transaction } from '@/types';
import { addChecksum } from './checksum';
import { splitArrayValue } from './transactions';
import { BatchFile, BatchTransaction } from './types';
import { ETH_CONTRACT } from '../constants';

// Safe's Transaction Builder rejects an array argument unless it is
// bracketed (string[] must additionally be valid JSON); this app's own
// form/import stores arrays as a bare `a, b` string, so bracket single-
// dimension array args on export. Nested/matrix arrays (`T[][]`) can't be
// built by this app's form at all, so they're passed through unchanged;
// tuples (and tuple arrays) are already exported as JSON, untouched here.
function toSafeContractInputsValues(
  inputs: { name: string; type: string }[],
  args: Record<string, string>
): Record<string, string> {
  const bracketed = inputs
    .filter(input => input.type.endsWith(']') && !input.type.includes('tuple'))
    .map(input => {
      const elementType = input.type.replace(/\[\d*\]$/, '');
      if (elementType.endsWith(']')) return [input.name, args[input.name]];

      // Quotes are part of a string element in the app's bare form (that is
      // what createContractCallTransaction encodes on save); splitArrayValue's
      // quote stripping is only right for non-string element types.
      const isString = elementType.startsWith('string');
      const elements = isString
        ? args[input.name].split(',').map(element => element.trim())
        : splitArrayValue(args[input.name]);

      return [
        input.name,
        isString ? JSON.stringify(elements) : `[${elements.join(', ')}]`
      ];
    });

  return { ...args, ...Object.fromEntries(bracketed) };
}

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
        // _form.args is only usable here when it is keyed by input name
        // (e.g. an oSnap-parsed call stores it as a positional array).
        const argsIsKeyed =
          tx._form.args !== null &&
          typeof tx._form.args === 'object' &&
          !Array.isArray(tx._form.args);

        // _form.method is the full signature; select by it, not by bare
        // name, or an overloaded ABI exports the wrong fragment. A bare
        // name on an overloaded ABI, or a 4-byte-selector fallback absent
        // from the ABI, makes getFunction throw — export the raw calldata
        // below instead of breaking the download.
        let method = null;
        if (argsIsKeyed) {
          try {
            method = JSON.parse(
              new Interface(tx._form.abi)
                .getFunction(tx._form.method)
                .format(FormatTypes.json)
            );
          } catch {
            // fall through to the raw export below
          }
        }

        if (method) {
          outputTransaction.contractMethod = {
            inputs: method.inputs,
            name: method.name,
            payable: method.payable
          };
          outputTransaction.contractInputsValues = toSafeContractInputsValues(
            method.inputs,
            tx._form.args
          );
          delete outputTransaction.data;
        }
      }

      return outputTransaction;
    })
  };

  return addChecksum(batchFile);
}
