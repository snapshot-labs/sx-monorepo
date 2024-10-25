export async function getABI(chainId: number, address: string) {
  let apiHost: string;
  if (chainId === 1) apiHost = 'https://api.etherscan.io';
  else if (chainId === 10) apiHost = 'https://api-optimistic.etherscan.io';
  else if (chainId === 137) apiHost = 'https://api.polygonscan.com';
  else if (chainId === 42161) apiHost = 'https://api.arbiscan.io';
  else if (chainId === 11155111) apiHost = 'https://api-sepolia.etherscan.io';
  else throw new Error('Unsupported chainId');

  const params = new URLSearchParams({
    module: 'contract',
    action: 'getAbi',
    address
  });

  const res = await fetch(`${apiHost}/api?${params}`);
  const { result } = await res.json();

  return JSON.parse(result);
}
