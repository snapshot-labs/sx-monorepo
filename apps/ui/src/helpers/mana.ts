export const MANA_URL =
  import.meta.env.VITE_MANA_URL || 'http://localhost:3000';

async function rpcCall(path: string, method: string, params: any) {
  const res = await fetch(`${MANA_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: null
    })
  });

  const { error, result } = await res.json();
  if (error) throw new Error('RPC call failed');

  return result;
}

export async function registerTransaction(
  chainId: number | string,
  params: {
    type: string;
    sender: string;
    hash: string;
    payload: any;
  }
) {
  return rpcCall(`stark_rpc/${chainId}`, 'registerTransaction', params);
}

export async function executionCall(
  network: 'eth' | 'stark',
  chainId: number | string,
  method:
    | 'finalizeProposal'
    | 'execute'
    | 'executeQueuedProposal'
    | 'executeStarknetProposal',
  params: any
) {
  return rpcCall(`${network}_rpc/${chainId}`, method, params);
}

export async function generateMerkleTree(
  chainId: number | string,
  params: {
    entries: string[];
  }
): Promise<string> {
  return rpcCall(`stark_rpc/${chainId}`, 'generateMerkleTree', params);
}

export async function getMerkleRoot(
  chainId: number | string,
  params: {
    requestId: string;
  }
): Promise<string> {
  return rpcCall(`stark_rpc/${chainId}`, 'getMerkleRoot', params);
}
