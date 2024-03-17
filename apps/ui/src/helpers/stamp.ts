import { formatAddress } from './utils';

export async function getNames(addresses: string[]): Promise<Record<string, string>> {
  try {
    const inputMapping = Object.fromEntries(
      addresses.map(address => [address, formatAddress(address)])
    );

    const res = await fetch('https://stamp.fyi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ method: 'lookup_addresses', params: Object.values(inputMapping) })
    });
    const data = (await res.json()).result;

    const entries: any = Object.entries(inputMapping)
      .map(([address, formatted]) => [address, data[formatted] || null])
      .filter(([, name]) => name);

    return Object.fromEntries(entries);
  } catch (e) {
    console.error('Failed to resolve names', e);
    return {};
  }
}
