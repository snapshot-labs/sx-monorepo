import { describe, it, expect } from 'vitest';

import {
  createSendTokenTransaction,
  createSendNftTransaction,
  createContractCallTransaction
} from '../transactions';

describe('transactions', () => {
  describe('createSendTokenTransaction', () => {
    const ethToken = {
      contract_decimals: 18,
      contract_name: 'Ether',
      contract_ticker_symbol: 'ETH',
      contract_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    };

    const balToken = {
      contract_decimals: 18,
      contract_name: 'Balancer',
      contract_ticker_symbol: 'BAL',
      contract_address: '0xba100000625a3754423978a60c9317c58a424e3d'
    };

    const form = {
      to: '0x000000000000000000000000000000000000dead',
      token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      amount: 1,
      value: 1076.29
    };

    it('should create eth transaction', () => {
      const tx = createSendTokenTransaction({ token: ethToken, form });

      expect(tx).toMatchSnapshot();
    });

    it('should create erc20 transaction', () => {
      const tx = createSendTokenTransaction({ token: balToken, form });

      expect(tx).toMatchSnapshot();
    });
  });

  describe('createSendNftTransaction', () => {
    const erc721Nft = {
      contract_decimals: 0,
      contract_name: 'BekoNekoz VX',
      contract_address: '0x9ed9dc8af51d74e638528ececd510dca5fe2a539',
      type: 'erc721',
      id: '0x9ed9dc8af51d74e638528ececd510dca5fe2a539:162',
      tokenId: '162'
    };

    const erc1155Nft = {
      contract_decimals: 0,
      contract_name: 'OpenSea Shared Storefront',
      contract_ticker_symbol: 'OPENSTORE',
      contract_address: '0x495f947276749ce646f68ac8c248420045cb7b5e',
      type: 'erc1155',
      id: '0x495f947276749ce646f68ac8c248420045cb7b5e:90408759670418442924295527194769699607350667425091321551161727238095924887553',
      tokenId:
        '90408759670418442924295527194769699607350667425091321551161727238095924887553'
    };

    const form = {
      to: '0x000000000000000000000000000000000000dead',
      nft: '0x9ed9dc8af51d74e638528ececd510dca5fe2a539:162',
      amount: '1'
    };

    it('should create erc721 transaction', () => {
      const tx = createSendNftTransaction({
        nft: erc721Nft,
        form,
        address: '0x000000000000000000000000000000000000dead'
      });

      expect(tx).toMatchSnapshot();
    });

    it('should create erc1155 transaction', () => {
      const tx = createSendNftTransaction({
        nft: erc1155Nft,
        form,
        address: '0x000000000000000000000000000000000000dead'
      });

      expect(tx).toMatchSnapshot();
    });
  });

  describe('createContractCallTransaction', () => {
    it('should create contract call transaction', () => {
      const tx = createContractCallTransaction({
        form: {
          to: '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844',
          abi: ['function deny(address guy)'],
          method: 'deny',
          args: {
            guy: '0x000000000000000000000000000000000000dead'
          }
        }
      });

      expect(tx).toMatchSnapshot();
    });

    it('should create contract call transaction with payable', () => {
      const tx = createContractCallTransaction({
        form: {
          to: '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844',
          abi: ['function deposit() payable'],
          method: 'deposit',
          args: {},
          amount: '20'
        }
      });

      expect(tx).toMatchSnapshot();
    });
  });
});
