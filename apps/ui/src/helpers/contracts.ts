import { abis } from './abis';
import Multicaller from './multicaller';
import { getProvider } from './provider';

export async function getTokensMetadata(chainId: number, tokens: string[]) {
  const provider = getProvider(chainId);

  const multi = new Multicaller(chainId.toString(), provider, abis.erc20);
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
