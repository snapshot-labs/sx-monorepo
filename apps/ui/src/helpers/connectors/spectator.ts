import { getAddress } from '@ethersproject/address';
import { validateAndParseAddress } from 'starknet';
import Connector from './connector';
import { getAddresses } from '../stamp';

const ADDRESS_KEY = 'connector:spectator:address';
const CHAIN_ID_KEY = 'connector:spectator:chainId';
const DEFAULT_CHAIN_ID = 1;

export function formatAddress(address: string): string {
  try {
    return address.length === 42
      ? getAddress(address)
      : validateAndParseAddress(address);
  } catch (e) {
    throw new Error(`${address} is not a valid address`);
  }
}

export default class Spectator extends Connector {
  async connect() {
    const searchParams = useUrlSearchParams('hash', {
      removeFalsyValues: true
    });
    const addressParams = searchParams.connectAs as string;
    const chainIdParams = searchParams.chainId as string;

    try {
      const chainId = await this.getChainId(chainIdParams);
      const address = await this.getAddress(addressParams, chainId);

      const provider = {
        selectedAddress: address,
        chainId,
        request: async (args: { method: string; params?: any[] }) => {
          if (args.method === 'eth_chainId' || args.method === 'net_version') {
            return chainId;
          } else if (args.method === 'eth_accounts') {
            return [address];
          }

          throw new Error('Not available when connected as spectator');
        }
      };

      localStorage.setItem(ADDRESS_KEY, address);
      localStorage.setItem(CHAIN_ID_KEY, chainId.toString());

      this.provider = provider;
    } catch (e) {
      console.error(e);
    } finally {
      searchParams.connectAs = '';
      searchParams.chainId = '';
    }
  }

  async disconnect() {
    localStorage.removeItem(ADDRESS_KEY);
    localStorage.removeItem(CHAIN_ID_KEY);
  }

  async getAddress(connectAs: string, chainId: number): Promise<string> {
    const address = connectAs || localStorage.getItem(ADDRESS_KEY);

    if (!address) {
      throw new Error('No address provided');
    }

    if (address.includes('.')) {
      const resolved = await getAddresses([address], chainId);
      if (resolved[address]) return resolved[address];
    }

    return formatAddress(address);
  }

  async getChainId(chainId: string): Promise<number> {
    return Number(
      chainId || localStorage.getItem(CHAIN_ID_KEY) || DEFAULT_CHAIN_ID
    );
  }
}
