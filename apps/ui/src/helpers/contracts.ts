import { Provider } from '@ethersproject/providers';
import { parseBytes32String } from '@ethersproject/strings';
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

  // Some legacy tokens (e.g., MKR, AVT) return bytes32 for name/symbol
  // instead of string. Retry the missing fields with a bytes32 ABI.
  const bytes32Multi = new Multicaller(chainId, provider, [
    'function name() view returns (bytes32)',
    'function symbol() view returns (bytes32)'
  ]);
  tokens.forEach(token => {
    if (!result[token].name) bytes32Multi.call(`${token}.name`, token, 'name');
    if (!result[token].symbol)
      bytes32Multi.call(`${token}.symbol`, token, 'symbol');
  });

  if (bytes32Multi.calls.length) {
    try {
      const fallback = await bytes32Multi.execute({ allowFailure: true });
      tokens.forEach(token => {
        result[token].name =
          result[token].name ||
          (fallback[token]?.name && parseBytes32String(fallback[token].name));
        result[token].symbol =
          result[token].symbol ||
          (fallback[token]?.symbol &&
            parseBytes32String(fallback[token].symbol));
      });
    } catch {
      // bytes32 fallback is best-effort; ignore decode/RPC errors.
    }
  }

  return tokens.map(token => ({
    address: token,
    name: result[token].name,
    symbol: result[token].symbol,
    decimals: result[token].decimals ?? 0
  }));
}
