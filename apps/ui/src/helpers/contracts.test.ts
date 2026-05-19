import { describe, expect, it } from 'vitest';
import { getTokensMetadata } from './contracts';

describe('getTokensMetadata', () => {
  it('should return metadata for specified tokens', async () => {
    const addresses = [
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      '0x514910771af9ca656af840dff83e8264ecf986ca'
    ];

    const metadata = await getTokensMetadata('1', addresses);

    expect(metadata).toEqual([
      {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6
      },
      {
        address: '0x514910771af9ca656af840dff83e8264ecf986ca',
        name: 'ChainLink Token',
        symbol: 'LINK',
        decimals: 18
      }
    ]);
  });

  it('should resolve symbol for legacy bytes32 tokens (e.g. AVT)', async () => {
    const [avt] = await getTokensMetadata('1', [
      '0x0d88ed6e74bbfd96b831231638b66c05571e824f'
    ]);

    expect(avt.address).toBe('0x0d88ed6e74bbfd96b831231638b66c05571e824f');
    expect(avt.symbol).toBe('AVT');
    expect(avt.decimals).toBe(18);
  });
});
