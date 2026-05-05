import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { call } from './call';
import { getProvider } from './provider';

const API_HOST = `https://api.etherscan.io/v2/api`;
const abiCache = new Map<string, any[]>();

export async function getABI(chainId: number, address: string): Promise<any[]> {
  const cacheKey = `${chainId}:${address.toLowerCase()}`;
  if (abiCache.has(cacheKey)) return abiCache.get(cacheKey)!;

  const params = new URLSearchParams({
    chainid: chainId.toString(),
    module: 'contract',
    action: 'getAbi',
    address,
    apikey: import.meta.env.VITE_ETHERSCAN_API_KEY || ''
  });

  const res = await fetch(`${API_HOST}?${params}`);
  const { result } = await res.json();
  const abi = JSON.parse(result);

  // if there is a `implementation` method, get the ABI for that instead
  if (abi.find(({ name }) => name === 'implementation')) {
    const implementationAddress = await call(getProvider(chainId), abi, [
      address,
      'implementation'
    ]);

    if (implementationAddress) {
      const implAbi = await getABI(chainId, implementationAddress);
      abiCache.set(cacheKey, implAbi);
      return implAbi;
    }
  }

  abiCache.set(cacheKey, abi);
  return abi;
}

export async function decodeCalldata(
  chainId: number,
  to: string,
  data: string
): Promise<{ abi: any[]; method: string; args: Record<string, any> }> {
  const abi = await getABI(chainId, to);
  const iface = new Interface(abi);
  const parsed = iface.parseTransaction({ data });
  const abiFunction = iface.getFunction(parsed.signature);

  const args = Object.fromEntries(
    abiFunction.inputs.map(input => {
      let value = parsed.args[input.name];
      if (BigNumber.isBigNumber(value)) {
        value = value.toString();
      } else if (Array.isArray(value)) {
        value = value.join(', ');
      }
      return [input.name, value];
    })
  );

  return { abi, method: parsed.signature, args };
}
