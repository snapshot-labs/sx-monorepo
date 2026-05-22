import { fetchWithKeepAlive } from '../utils';

const BLOCKAID_API_URL = 'https://api.blockaid.io/dapp/v1/scan';
const BLOCKAID_API_KEY = process.env.BLOCKAID_API_KEY || '';

export async function scan(url: string) {
  if (!BLOCKAID_API_KEY) return { is_malicious: false };
  const res = await fetchWithKeepAlive(BLOCKAID_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BLOCKAID_API_KEY
    },
    body: JSON.stringify({ url })
  });
  return await res.json();
}
