export async function executionCall(
  baseUrl: string,
  chainId: number,
  method: 'execute' | 'executeQueuedProposal',
  params: any
) {
  const res = await fetch(`${baseUrl}/eth_rpc/${chainId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: method,
      params,
      id: null
    })
  });

  const { error, result } = await res.json();
  if (error) throw new Error('Finalization failed');

  return result;
}
