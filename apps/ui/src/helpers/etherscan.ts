import { call } from './call';
import { getProvider } from './provider';

export async function getABI(chainId: number, address: string) {
  let apiHost: string;
  if (chainId === 1) apiHost = 'https://api.etherscan.io';
  else if (chainId === 10) apiHost = 'https://api-optimistic.etherscan.io';
  else if (chainId === 137) apiHost = 'https://api.polygonscan.com';
  else if (chainId === 8453) apiHost = 'https://api.basescan.org';
  else if (chainId === 42161) apiHost = 'https://api.arbiscan.io';
  else if (chainId === 11155111) apiHost = 'https://api-sepolia.etherscan.io';
  else throw new Error('Unsupported chainId');

  const params = new URLSearchParams({
    module: 'contract',
    action: 'getAbi',
    address,
    apikey: import.meta.env.VITE_ETHERSCAN_API_KEY || ''
  });

  const res = await fetch(`${apiHost}/api?${params}`);
  const { result } = await res.json();
  const abi = JSON.parse(result);

  // if there is a `implementation` method, get the ABI for that instead
  if (abi.find(({ name }) => name === 'implementation')) {
    const implementationAddress = await call(getProvider(chainId), abi, [
      address,
      'implementation'
    ]);

    if (implementationAddress) {
      return await getABI(chainId, implementationAddress);
    }
  }

  return abi;
}
