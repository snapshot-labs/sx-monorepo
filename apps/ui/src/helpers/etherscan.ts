import snapshot from '@snapshot-labs/snapshot.js';

export async function getABI(address: string) {
  const uri = 'https://api-goerli.etherscan.io/api';
  const params = new URLSearchParams({
    module: 'contract',
    action: 'getAbi',
    address
  });
  const { result } = await snapshot.utils.getJSON(`${uri}?${params}`);
  return JSON.parse(result);
}
