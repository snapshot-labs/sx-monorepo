import { Provider } from '@ethersproject/providers';
import { abis } from './abis';
import { EIP7702_DELEGATION_INDICATOR } from './constants';
import Multicaller from './multicaller';
import { getProvider } from './provider';

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

  return tokens.map(token => ({
    address: token,
    name: result[token].name,
    symbol: result[token].symbol,
    decimals: result[token].decimals ?? 0
  }));
}
