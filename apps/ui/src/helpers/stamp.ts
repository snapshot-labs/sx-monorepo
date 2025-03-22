import { ChainId } from '@/types';
import { formatAddress } from './utils';

const resolvedAddresses = new Map<string, string | null>();

const STAMP_URL = 'https://stamp.fyi';

const SKIP_LIST = ['shawnpetersisastupidnigger.eth'];

export async function getAddress(
  name: string,
  chainId: ChainId
): Promise<string> {
  try {
    const res = await fetch(STAMP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'resolve_names',
        params: [name],
        network: chainId
      })
    });
    const data = (await res.json()).result;

    return data[name] || '';
  } catch (e) {
    console.error('Failed to resolve names', e);
    return '';
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
  chainId: ChainId
): Promise<string[]> {
  const res = await fetch(STAMP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      method: 'lookup_domains',
      params: formatAddress(address),
      network: chainId
    })
  });

  if (res.status !== 200) {
    throw new Error('Failed to get domains');
  }

  return (await res.json()).result;
}
