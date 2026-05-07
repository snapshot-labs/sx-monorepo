import EventEmitter from 'events';
import { getAddress } from '@ethersproject/address';
import { validateAndParseAddress } from 'starknet';
import Connector from './connector';

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
      case 'wallet_switchEthereumChain': {
        // Allow the chain switch to succeed for guest sessions: nothing
        // safety-critical reads the guest's chainId, and rejecting here would
        // surface a misleading "wallet not supported" error from the network
        // verification path. The actual "guest can't do this" rejection
        // happens at sign time when eth_signTypedData_v4 / eth_sendTransaction
        // hit the default branch.
        const newChainId = Number(args.params?.[0]?.chainId);
        if (Number.isFinite(newChainId) && newChainId !== this.chainId) {
          this.chainId = newChainId;
          this.emit('chainChanged', newChainId);
        }
        return null;
      }
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

function formatAddress(address: string): string {
  try {
    return address.length === 42
      ? getAddress(address)
      : validateAndParseAddress(address);
  } catch {
    throw new Error(`${address} is not a valid address`);
  }
}

export default class Guest extends Connector {
  async connect(): Promise<void> {
    const searchParams = new URLSearchParams(
      window.location.hash.split('?')[1] ?? ''
    );

    try {
      const chainId = await this.#getChainId(searchParams.get('chainId') ?? '');
      const address = await this.#getAddress(
        searchParams.get('as') ?? '',
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
    } catch (err) {
      this.provider = undefined;
      console.error(err);
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

    if (address.includes('.') && this.options.resolveName) {
      const resolved = await this.options.resolveName(address, chainId);
      if (resolved) return resolved;
    }

    return formatAddress(address);
  }

  async #getChainId(chainId: string): Promise<number> {
    return Number(
      chainId || localStorage.getItem(CHAIN_ID_KEY) || DEFAULT_CHAIN_ID
    );
  }
}
