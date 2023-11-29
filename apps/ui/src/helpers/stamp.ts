export async function getNames(addresses: string[]): Promise<Record<string, string>> {
  try {
    const res = await fetch('https://stamp.fyi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ method: 'lookup_addresses', params: addresses })
    });
    const data = (await res.json()).result;

    const dataToLc = Object.fromEntries(Object.entries(data).map(([k, v]) => [k.toLowerCase(), v]));
    const entries: any = addresses
      .map(address => [address, dataToLc[address.toLowerCase()] || null])
      .filter(([, name]) => name);

    return Object.fromEntries(entries);
  } catch (e) {
    console.error('Failed to resolve names', e);
    return {};
  }
}
