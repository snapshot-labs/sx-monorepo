import { Interface } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { parseBytes32String } from '@ethersproject/strings';
import { abis } from './abis';
import { MULTICALL3_ADDRESSES, MULTICALL_ABI } from './call';
import { EIP7702_DELEGATION_INDICATOR } from './constants';
import { getProvider } from './provider';

const stringIface = new Interface(abis.erc20);
const bytes32Iface = new Interface([
  'function name() view returns (bytes32)',
  'function symbol() view returns (bytes32)'
]);

function decodeField(
  field: 'name' | 'symbol' | 'decimals',
  returnData: string
): string | number | null {
  try {
    return stringIface.decodeFunctionResult(field, returnData)[0];
  } catch {
    try {
      return parseBytes32String(
        bytes32Iface.decodeFunctionResult(field, returnData)[0]
      );
    } catch {
      return null;
    }
  }
}

export async function getIsContract(provider: Provider, address: string) {
  const code = await provider.getCode(address);

  if (code === '0x') return false;
  if (code.startsWith(EIP7702_DELEGATION_INDICATOR)) return false;

  return true;
}

export async function getTokensMetadata(chainId: string, tokens: string[]) {
  const provider = getProvider(Number(chainId));
  const multi3 = new Contract(MULTICALL3_ADDRESSES, MULTICALL_ABI, provider);

  const fields = ['name', 'symbol', 'decimals'] as const;
  const callItems = tokens.flatMap(token =>
    fields.map(field => ({ token, field }))
  );

  const rawResults: [boolean, string][] = await multi3.aggregate3(
    callItems.map(({ token, field }) => [
      token.toLowerCase(),
      true,
      stringIface.encodeFunctionData(field)
    ])
  );

  const result: Record<string, Record<string, any>> = {};
  tokens.forEach(token => {
    result[token] = { name: null, symbol: null, decimals: null };
  });

  rawResults.forEach(([success, returnData], i) => {
    const { token, field } = callItems[i];
    result[token][field] = success ? decodeField(field, returnData) : null;
  });

  return tokens.map(token => ({
    address: token,
    name: result[token].name,
    symbol: result[token].symbol,
    decimals: result[token].decimals ?? 0
  }));
}
