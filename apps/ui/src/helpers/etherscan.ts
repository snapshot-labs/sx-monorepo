export async function getABI(chainId: number, address: string) {
  let apiHost;
  if (chainId === 1) apiHost = 'https://api.etherscan.io';
  else if (chainId === 5) apiHost = 'https://api-goerli.etherscan.io';
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
