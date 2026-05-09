import { fetchWithKeepAlive } from '../utils';

const CHAINPATROL_API_URL = 'https://app.chainpatrol.io/api/v2/asset/check';
const CHAINPATROL_API_KEY = process.env.CHAINPATROL_API_KEY || '';

export async function scan(url: string) {
  if (!CHAINPATROL_API_KEY) return { is_malicious: false };
  const res = await fetchWithKeepAlive(CHAINPATROL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': CHAINPATROL_API_KEY
    },
    body: JSON.stringify({ content: url })
  });
  const result = await res.json();
  return { is_malicious: result.status === 'BLOCKED' };
}
