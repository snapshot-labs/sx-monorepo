import { formatAddress } from './utils';

const resolvedAddresses = new Map<string, string | null>();

export async function getNames(addresses: string[]): Promise<Record<string, string>> {
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
      const res = await fetch('https://stamp.fyi', {
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
      .map(([address, formatted]) => [address, resolvedAddresses.get(formatted) || null])
      .filter(([, name]) => name);

    return Object.fromEntries(entries);
  } catch (e) {
    console.error('Failed to resolve names', e);
    return {};
  }
}
