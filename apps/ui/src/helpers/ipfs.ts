import fetch from 'cross-fetch';

const url: any = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3000';

export async function set(json) {
  const init = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'pin',
      params: json,
      id: null
    })
  };
  const res = await fetch(url, init);
  return (await res.json()).result;
}
