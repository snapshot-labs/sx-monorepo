import EventEmitter from 'events';
import { getAddress } from '@ethersproject/address';
import { validateAndParseAddress } from 'starknet';
import Connector from './connector';
import { getAddresses } from '../stamp';

const ADDRESS_KEY = 'connector:guest:address';
const CHAIN_ID_KEY = 'connector:guest:chainId';
const DEFAULT_CHAIN_ID = 1;

class GuestProvider extends EventEmitter {
  public selectedAddress: string;
  public chainId: number;

  constructor(address: string, chainId: number) {
    super();

    this.selectedAddress = address;
    this.chainId = chainId;
    this.#save(address, chainId);
  }

  async request(args: { method: string; params?: any[] }): Promise<any> {
    switch (args.method) {
      case 'eth_chainId':
      case 'net_version':
        return this.chainId;
      case 'eth_accounts':
        return [this.selectedAddress];
      default:
        throw new Error('Not available when connected as guest');
    }
  }

  changeAccount(address: string, chainId: number) {
    this.#save(address, chainId);

    if (this.selectedAddress !== address) {
      this.emit('accountsChanged', [address]);
      this.selectedAddress = address;
    }
    if (this.chainId !== chainId) {
      this.emit('chainChanged', chainId);
      this.chainId = chainId;
    }
  }

  disconnect() {
    localStorage.removeItem(ADDRESS_KEY);
    localStorage.removeItem(CHAIN_ID_KEY);
  }

  #save(address: string, chainId: number) {
    localStorage.setItem(ADDRESS_KEY, address);
    localStorage.setItem(CHAIN_ID_KEY, chainId.toString());
  }
}

export function formatAddress(address: string): string {
  try {
    return address.length === 42
      ? getAddress(address)
      : validateAndParseAddress(address);
  } catch (e) {
    throw new Error(`${address} is not a valid address`);
  }
}

export default class Guest extends Connector {
  constructor(options) {
    super(options);

    const router = useRouter();

    watch(
      () => router.currentRoute.value.query.as,
      async address => {
        if (!address) return;

        await this.connect();

        const query = { ...router.currentRoute.value.query };
        delete query.as;
        delete query.chainId;

        router.push({ query });
      }
    );
  }

  async connect(): Promise<void> {
    const searchParams = useUrlSearchParams('hash');

    try {
      const chainId = await this.#getChainId(searchParams.chainId as string);
      const address = await this.#getAddress(
        searchParams.as as string,
        chainId
      );

      if (address && address === this.provider?.selectedAddress) {
        return;
      }

      if (this.provider) {
        this.provider.changeAccount(address, chainId);
      } else {
        this.provider = new GuestProvider(address, chainId);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async disconnect() {
    this.provider.disconnect();
  }

  async #getAddress(input: string, chainId: number): Promise<string> {
    const address = input || localStorage.getItem(ADDRESS_KEY);

    if (!address) {
      throw new Error('No address provided');
    }

    if (address.includes('.')) {
      const resolved = await getAddresses([address], chainId);
      if (resolved[address]) return resolved[address];
    }

    return formatAddress(address);
  }

  async #getChainId(chainId: string): Promise<number> {
    return Number(
      chainId || localStorage.getItem(CHAIN_ID_KEY) || DEFAULT_CHAIN_ID
    );
  }
}
