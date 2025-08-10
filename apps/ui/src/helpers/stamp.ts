import { ensNormalize } from '@ethersproject/hash';
import { ChainId } from '@/types';
import { formatAddress } from './utils';

const resolvedAddresses = new Map<string, string | null>();
const resolvedNames = new Map<string, string | null>();

const STAMP_URL = 'https://stamp.fyi';

const SKIP_LIST = ['shawnpetersisastupidnigger.eth'];

export async function getAddresses(
  names: string[],
  chainId: ChainId
): Promise<Record<string, string>> {
  try {
    const inputMapping = Object.fromEntries(
      names.map(name => [name, ensNormalize(name)])
    );
    const resolvedNamesKeys = Array.from(resolvedNames.keys());
    const unresolvedNames = Object.values(inputMapping).filter(
      name => !resolvedNamesKeys.includes(name)
    );
    let data: string[] = [];

    if (unresolvedNames.length > 0) {
      const res = await fetch(STAMP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: 'resolve_names',
          params: unresolvedNames,
          network: chainId
        })
      });
      data = (await res.json()).result;

      unresolvedNames.forEach((formatted: string) => {
        resolvedNames.set(formatted, data[formatted]);
      });
    }

    const entries: any = Object.entries(inputMapping)
      .map(([name, formatted]) => [name, resolvedNames.get(formatted)])
      .filter(([, address]) => address);

    return Object.fromEntries(entries);
  } catch (e) {
    console.error('Failed to lookup addresses', e);
    return {};
  }
}

export async function getNames(
  addresses: string[]
): Promise<Record<string, string>> {
  try {
    const inputMapping = Object.fromEntries(
      addresses.map(address => [address, formatAddress(address)])
    );
    const resolvedAddressesKeys = Array.from(resolvedAddresses.keys());
    const unresolvedAddresses = Object.values(inputMapping).filter(
      address => !resolvedAddressesKeys.includes(address)
    );
    let data: string[] = [];

    if (unresolvedAddresses.length > 0) {
      const res = await fetch(STAMP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: 'lookup_addresses',
          params: unresolvedAddresses
        })
      });
      data = (await res.json()).result;

      unresolvedAddresses.forEach((formatted: string) => {
        resolvedAddresses.set(formatted, data[formatted]);
      });
    }

    const entries: any = Object.entries(inputMapping)
      .map(([address, formatted]) => {
        let name = resolvedAddresses.get(formatted);
        if (name && SKIP_LIST.includes(name)) {
          name = null;
        }
        return [address, name];
      })
      .filter(([, name]) => name);

    return Object.fromEntries(entries);
  } catch (e) {
    console.error('Failed to resolve names', e);
    return {};
  }
}

export async function getENSNames(
  address: string,
  chainIds: ChainId[]
): Promise<string[]> {
  const res = await fetch(STAMP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      method: 'lookup_domains',
      params: formatAddress(address),
      network: chainIds
    })
  });

  if (res.status !== 200) {
    throw new Error('Failed to get domains');
  }

  return (await res.json()).result;
}

export async function getOwner(
  name: string,
  chainId: ChainId
): Promise<string> {
  const res = await fetch(STAMP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      method: 'get_owner',
      params: name,
      network: chainId
    })
  });

  if (res.status !== 200) {
    throw new Error('Failed to get owner');
  }

  return (await res.json()).result;
}
