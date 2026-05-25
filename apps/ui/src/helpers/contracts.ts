import { Provider } from '@ethersproject/providers';
import { abis } from './abis';
import { EIP7702_DELEGATION_INDICATOR } from './constants';
import Multicaller from './multicaller';
import { getProvider } from './provider';

// Pre-EIP-20 tokens declare name/symbol as bytes32 and the standard ERC-20
// ABI fails to decode them, so they would otherwise be dropped from the
// treasury list. Override the known cases manually.
const HARDCODED_TOKEN_METADATA: Record<
  string,
  Record<string, { name: string; symbol: string; decimals: number }>
> = {
  '1': {
    '0x0d88ed6e74bbfd96b831231638b66c05571e824f': {
      name: 'Aventus',
      symbol: 'AVT',
      decimals: 18
    }
  }
};

export async function getIsContract(provider: Provider, address: string) {
  const code = await provider.getCode(address);

  if (code === '0x') return false;
  if (code.startsWith(EIP7702_DELEGATION_INDICATOR)) return false;

  return true;
}

export async function getTokensMetadata(chainId: string, tokens: string[]) {
  const provider = getProvider(Number(chainId));

  const multi = new Multicaller(chainId, provider, abis.erc20);
  tokens.forEach(token => {
    multi.call(`${token}.name`, token, 'name');
    multi.call(`${token}.symbol`, token, 'symbol');
    multi.call(`${token}.decimals`, token, 'decimals');
  });

  const result = await multi.execute({
    allowFailure: true
  });

  return tokens.map(token => {
    const hardcoded = HARDCODED_TOKEN_METADATA[chainId]?.[token.toLowerCase()];
    if (hardcoded) return { address: token, ...hardcoded };

    return {
      address: token,
      name: result[token].name,
      symbol: result[token].symbol,
      decimals: result[token].decimals ?? 0
    };
  });
}
