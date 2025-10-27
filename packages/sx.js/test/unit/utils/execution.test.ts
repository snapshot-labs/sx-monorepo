import { describe, expect, it } from 'vitest';
import {
  convertToTransaction,
  createSendTokenTransaction,
  decodeExecution
} from '../../../src/utils/execution';

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address recipient, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address sender, address recipient, uint256 amount) returns (bool)'
];

const ENS_TOKEN_ABI = ['function delegate(address delegatee)'];

describe('createSendTokenTransaction', () => {
  it('should create a SendTokenTransaction with correct structure', async () => {
    const result = await createSendTokenTransaction(
      {
        target: '0x8bf6f9f91d70a9a3c2fce45df30ece735c54d624',
        calldata: '0xa9059cbb',
        value: '0'
      },
      '10000000',
      {
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      }
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "_form": {
          "amount": "10000000",
          "recipient": "0x8bf6f9f91d70a9a3c2fce45df30ece735c54d624",
          "token": {
            "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            "decimals": 6,
            "name": "USD Coin",
            "symbol": "USDC",
          },
        },
        "_type": "sendToken",
        "data": "0xa9059cbb",
        "salt": "0",
        "to": "0x8bf6f9f91d70a9a3c2fce45df30ece735c54d624",
        "value": "0",
      }
    `);
  });
});

describe('decodeExecution', () => {
  it('should decode non-transfer function as contractCall transaction', async () => {
    const result = await decodeExecution(
      ENS_TOKEN_ABI,
      {
        target: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
        calldata:
          '0x5c19a95c0000000000000000000000008bf6f9f91d70a9a3c2fce45df30ece735c54d624',
        value: '0'
      },
      1
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "_form": {
          "abi": [
            "function delegate(address delegatee)",
          ],
          "amount": "0",
          "args": {
            "delegatee": "0x8Bf6F9F91D70a9a3c2FCe45dF30EcE735C54D624",
          },
          "method": "delegate",
          "recipient": "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
        },
        "_type": "contractCall",
        "data": "0x5c19a95c0000000000000000000000008bf6f9f91d70a9a3c2fce45df30ece735c54d624",
        "salt": "0",
        "to": "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
        "value": "0",
      }
    `);
  });

  it('should return null for invalid calldata', async () => {
    const decoded = await decodeExecution(
      ERC20_ABI,
      {
        target: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        calldata: '0xdeadbeef',
        value: '0'
      },
      1
    );

    expect(decoded).toBeNull();
  });
});

describe('convertToTransaction', () => {
  it('should create sendToken transaction for native token (0x calldata)', async () => {
    const result = await convertToTransaction(
      {
        target: '0x8bf6f9f91d70a9a3c2fce45df30ece735c54d624',
        calldata: '0x',
        value: '1000000000000000000'
      },
      1
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "_form": {
          "amount": "1000000000000000000",
          "recipient": "0x8bf6f9f91d70a9a3c2fce45df30ece735c54d624",
          "token": {
            "address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            "decimals": 18,
            "name": "Ethereum",
            "symbol": "ETH",
          },
        },
        "_type": "sendToken",
        "data": "0x",
        "salt": "0",
        "to": "0x8bf6f9f91d70a9a3c2fce45df30ece735c54d624",
        "value": "1000000000000000000",
      }
    `);
  });

  it('should handle ERC20 transfer', async () => {
    const result = await convertToTransaction(
      {
        target: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        calldata:
          '0xa9059cbb0000000000000000000000008bf6f9f91d70a9a3c2fce45df30ece735c54d62400000000000000000000000000000000000000000000000000000000009896800',
        value: '0'
      },
      1
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "_form": {
          "recipient": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        },
        "_type": "raw",
        "data": "0xa9059cbb0000000000000000000000008bf6f9f91d70a9a3c2fce45df30ece735c54d62400000000000000000000000000000000000000000000000000000000009896800",
        "salt": "0",
        "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "value": "0",
      }
    `);
  });

  it('should handle Poster contract call', async () => {
    const result = await convertToTransaction(
      {
        target: '0x000000000000cd17345801aa8147b8D3950260FF',
        calldata:
          '0x0ae1b13d00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000b48656c6c6f20576f726c64000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000474657374000000000000000000000000000000000000000000000000000000',
        value: '0'
      },
      1
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "_form": {
          "recipient": "0x000000000000cd17345801aa8147b8D3950260FF",
        },
        "_type": "raw",
        "data": "0x0ae1b13d00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000b48656c6c6f20576f726c64000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000474657374000000000000000000000000000000000000000000000000000000",
        "salt": "0",
        "to": "0x000000000000cd17345801aa8147b8D3950260FF",
        "value": "0",
      }
    `);
  });

  it('should return raw transaction if ABI is not available', async () => {
    const result = await convertToTransaction(
      {
        target: '0x1234567890123456789012345678901234567890',
        calldata: '0xabcdef00',
        value: '0'
      },
      1
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "_form": {
          "recipient": "0x1234567890123456789012345678901234567890",
        },
        "_type": "raw",
        "data": "0xabcdef00",
        "salt": "0",
        "to": "0x1234567890123456789012345678901234567890",
        "value": "0",
      }
    `);
  });
});
