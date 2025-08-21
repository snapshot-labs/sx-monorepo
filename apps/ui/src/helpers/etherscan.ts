import { call } from './call';
import { getProvider } from './provider';

export async function getABI(chainId: number, address: string) {
  const apiHost = `https://api.etherscan.io/v2/api`;

  const params = new URLSearchParams({
    chainid: chainId.toString(),
    module: 'contract',
    action: 'getAbi',
    address,
    apikey: import.meta.env.VITE_ETHERSCAN_API_KEY || ''
  });

  const res = await fetch(`${apiHost}?${params}`);
  const { result } = await res.json();
  const abi = JSON.parse(result);

  // if there is a `implementation` method, get the ABI for that instead
  if (abi.find(({ name }) => name === 'implementation')) {
    const implementationAddress = await call(
      getProvider(chainId.toString()),
      abi,
      [address, 'implementation']
    );

    if (implementationAddress) {
      return await getABI(chainId, implementationAddress);
    }
  }

  return abi;
}
