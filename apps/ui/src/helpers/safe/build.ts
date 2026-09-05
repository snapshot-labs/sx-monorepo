import { FormatTypes, Interface } from '@ethersproject/abi';
import { parseFormArrayValue } from '@/helpers/transactions';
import { Transaction } from '@/types';
import { addChecksum } from './checksum';
import { BatchFile, BatchTransaction } from './types';
import { ETH_CONTRACT } from '../constants';

// Safe requires array args bracketed (string[] must also be valid JSON);
// this app stores them as a bare `a, b`, so bracket single-dim arrays here.
// Nested arrays can't be built by this app's form, so left unchanged;
// tuples are already exported as JSON.
function toSafeContractInputsValues(
  inputs: { name: string; type: string }[],
  args: Record<string, string>
): Record<string, string> {
  const bracketed = inputs
    .filter(input => input.type.endsWith(']') && !input.type.includes('tuple'))
    .map(input => {
      const elementType = input.type.replace(/\[\d*\]$/, '');
      if (elementType.endsWith(']')) return [input.name, args[input.name]];

      // Must split exactly like the save path (no quote stripping), or a
      // quoted element would round-trip differently.
      const isString = elementType.startsWith('string');
      const elements = parseFormArrayValue(args[input.name]);

      return [
        input.name,
        isString ? JSON.stringify(elements) : `[${elements.join(', ')}]`
      ];
    });

  // A checkbox `bool` arg is a real boolean at runtime; must stringify it
  // or export writes an unquoted JSON `false`/`true` that parseBooleanValue
  // throws on re-reading.
  const scalars = Object.fromEntries(
    Object.entries(args).map(([name, value]) => [
      name,
      typeof value === 'string' ? value : String(value)
    ])
  );

  return { ...scalars, ...Object.fromEntries(bracketed) };
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

      // Only '1' is emitted so call-only files stay byte-identical to the
      // Transaction Builder standard.
      if (tx.operation === '1') outputTransaction.operation = '1';

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

        // Select by the full signature, not bare name, or an overloaded ABI
        // exports the wrong fragment. getFunction throws for an unresolvable
        // overload/selector; catch and fall through to the raw export below.
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
