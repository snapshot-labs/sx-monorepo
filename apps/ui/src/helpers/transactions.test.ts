import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createContractCallTransaction,
  createSendNftTransaction,
  createSendTokenTransaction,
  createStakeTokenTransaction
} from './transactions';

describe('transactions', () => {
  beforeAll(() => {
    vi.stubGlobal('crypto', {
      getRandomValues: (arr: Uint8Array) => {
        arr.fill(0);
        return arr;
      }
    });
  });

  describe('createSendTokenTransaction', () => {
    const ethToken = {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
      contractAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      logo: null,
      tokenBalance: '0x0',
      price: 0,
      change: 0,
      value: 0
    };

    const balToken = {
      decimals: 18,
      name: 'Balancer',
      symbol: 'BAL',
      contractAddress: '0xba100000625a3754423978a60c9317c58a424e3d',
      logo: null,
      tokenBalance: '0x0',
      price: 0,
      change: 0,
      value: 0
    };

    const form = {
      to: '0x000000000000000000000000000000000000dead',
      token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      amount: 1,
      value: 1076.29
    };

    it('should create eth transaction', async () => {
      const tx = await createSendTokenTransaction({ token: ethToken, form });

      expect(tx).toMatchSnapshot();
    });

    it('should create erc20 transaction', async () => {
      const tx = await createSendTokenTransaction({ token: balToken, form });

      expect(tx).toMatchSnapshot();
    });
  });

  describe('createSendNftTransaction', () => {
    const erc721Nft = {
      collectionName: 'BekoNekoz VX',
      title: 'BekoNekoz VX #162',
      contractAddress: '0x9ed9dc8af51d74e638528ececd510dca5fe2a539',
      type: 'erc721',
      id: '0x9ed9dc8af51d74e638528ececd510dca5fe2a539:162',
      tokenId: '162'
    };

    const erc1155Nft = {
      collectionName: 'OpenSea Shared Storefront',
      title: 'OpenSea Shared Storefront #1',
      contractAddress: '0x495f947276749ce646f68ac8c248420045cb7b5e',
      type: 'erc1155',
      id: '0x495f947276749ce646f68ac8c248420045cb7b5e:90408759670418442924295527194769699607350667425091321551161727238095924887553',
      tokenId:
        '90408759670418442924295527194769699607350667425091321551161727238095924887553'
    };

    const form = {
      to: '0x000000000000000000000000000000000000dead',
      amount: '1'
    };

    it('should create erc721 transaction', async () => {
      const tx = await createSendNftTransaction({
        nft: erc721Nft,
        form,
        address: '0x000000000000000000000000000000000000dead'
      });

      expect(tx).toMatchSnapshot();
    });

    it('should create erc1155 transaction', async () => {
      const tx = await createSendNftTransaction({
        nft: erc1155Nft,
        form,
        address: '0x000000000000000000000000000000000000dead'
      });

      expect(tx).toMatchSnapshot();
    });
  });

  describe('createContractCallTransaction', () => {
    it('should create contract call transaction', async () => {
      const tx = await createContractCallTransaction({
        form: {
          to: '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844',
          abi: ['function deny(address guy)'],
          method: 'deny(address)',
          args: {
            guy: '0x000000000000000000000000000000000000dead'
          }
        }
      });

      expect(tx).toMatchSnapshot();
    });

    it('should create contract call transaction with payable', async () => {
      const tx = await createContractCallTransaction({
        form: {
          to: '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844',
          abi: ['function deposit() payable'],
          method: 'deposit()',
          args: {},
          amount: '20'
        }
      });

      expect(tx).toMatchSnapshot();
    });

    it('should create contract call transaction with ENS domain', async () => {
      const tx = await createContractCallTransaction({
        form: {
          to: '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844',
          abi: ['function deny(address guy)'],
          method: 'deny(address)',
          args: {
            guy: '0cf5e.eth'
          }
        }
      });

      expect(tx).toMatchSnapshot();
    });

    it('should create contract call transaction with array domain', async () => {
      const tx = await createContractCallTransaction({
        form: {
          to: '0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844',
          abi: ['function deny(address[] guys)'],
          method: 'deny(address[])',
          args: {
            guys: '0x000000000000000000000000000000000000dead,0x000000000000000000000000000000000000dead'
          }
        }
      });

      expect(tx).toMatchSnapshot();
    });
  });

  describe('createStakeTokenTransaction', () => {
    const form = {
      to: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
      amount: 1,
      args: {
        referral: '0x01e8CEC73B020AB9f822fD0dee3Aa4da2fe39e38'
      }
    };

    it('should create a stake token transaction', async () => {
      const tx = await createStakeTokenTransaction({ form });

      expect(tx).toMatchSnapshot();
    });
  });
});
