import { Interface } from '@ethersproject/abi';
import { Transaction } from '@snapshot-labs/sx';
import { ETH_CONTRACT } from '../constants';

export function parseSafeSnapTransaction(tx: any): Transaction {
  const base = { to: tx.to, data: tx.data, value: tx.value, salt: '' };

  if (tx.type === 'transferFunds') {
    return {
      ...base,
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

  if (tx.type === 'transferNFT') {
    return {
      ...base,
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

  if (tx.type === 'contractInteraction') {
    const abi = typeof tx.abi === 'string' ? JSON.parse(tx.abi) : tx.abi;
    let methodName = '';
    const args: any[] = [];
    try {
      const iface = new Interface(abi);
      const fragment = iface.getFunction(tx.data.slice(0, 10));
      methodName = fragment.name;
      const decoded = iface.decodeFunctionData(fragment, tx.data);
      for (let i = 0; i < decoded.length; i++) {
        args.push(decoded[i].toString());
      }
    } catch {
      methodName = tx.data.slice(0, 10);
    }
    return {
      ...base,
      _type: 'contractCall',
      _form: { recipient: tx.to, method: methodName, args, abi }
    };
  }

  return { ...base, _type: 'raw', _form: { recipient: tx.to } };
}
