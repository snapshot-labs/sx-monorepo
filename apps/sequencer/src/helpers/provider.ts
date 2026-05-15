import { StaticJsonRpcProvider } from '@ethersproject/providers';

export const BROVIDER_URL =
  process.env.BROVIDER_URL ?? 'https://rpc.brovider.xyz';
const providers = new Map<string, StaticJsonRpcProvider>();

export function getProvider(network: string | number): StaticJsonRpcProvider {
  const key = String(network);
  let provider = providers.get(key);
  if (!provider) {
    provider = new StaticJsonRpcProvider(
      { url: `${BROVIDER_URL}/${key}?client=sequencer`, timeout: 25000 },
      Number(network)
    );
    providers.set(key, provider);
  }
  return provider;
}
