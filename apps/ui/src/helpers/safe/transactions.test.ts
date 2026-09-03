import { Interface } from '@ethersproject/abi';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getABI } from '@/helpers/etherscan';
import { createContractCallTransaction } from '@/helpers/transactions';
import { addChecksum } from './checksum';
import { parseSafeImportFile } from './transactions';

// Decoding fetches the contract ABI; stub it so the test stays offline.
vi.mock('@/helpers/etherscan', () => ({ getABI: vi.fn() }));

// Fail loudly on an unmocked getABI call instead of leaking a queued mock.
beforeEach(() => {
  vi.mocked(getABI).mockReset().mockRejectedValue(new Error('unmocked getABI'));
});

const TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' }
    ],
    outputs: []
  }
];

function file(transactions: any[], chainId = '1') {
  return JSON.stringify({ version: '1.0', chainId, transactions });
}

describe('parseSafeImportFile', () => {
  it('keeps the calldata from the file when present', async () => {
    const data = new Interface(TRANSFER_ABI).encodeFunctionData('transfer', [
      '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      '100'
    ]);

    const {
      transactions: [tx]
    } = await parseSafeImportFile(
      file([
        {
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          value: '0',
          data,
          contractMethod: {
            name: 'transfer',
            payable: false,
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' }
            ]
          },
          contractInputsValues: {
            to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
            value: '100'
          }
        }
      ])
    );

    expect(tx._type).toBe('contractCall');
    expect(tx.to).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    expect(tx.data).toBe(data);
    expect((tx._form as any).method).toBe('transfer(address,uint256)');
    expect((tx._form as any).args).toEqual({
      to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      value: '100'
    });
  });

  it('encodes the calldata when the file omits it', async () => {
    const expected = new Interface(TRANSFER_ABI).encodeFunctionData(
      'transfer',
      ['0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', '100']
    );

    const {
      transactions: [tx]
    } = await parseSafeImportFile(
      file([
        {
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          value: '0',
          data: null,
          contractMethod: {
            name: 'transfer',
            payable: false,
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' }
            ]
          },
          contractInputsValues: {
            to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
            value: '100'
          }
        }
      ])
    );

    expect(tx.data).toBe(expected);
  });

  it('falls back to a raw transaction for a receive()/fallback() method', async () => {
    const {
      transactions: [tx]
    } = await parseSafeImportFile(
      file([
        {
          to: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
          value: '1000',
          data: null,
          contractMethod: { name: 'receive', payable: true, inputs: [] },
          contractInputsValues: null
        }
      ])
    );

    expect(tx._type).toBe('raw');
    expect(tx.data).toBe('0x');
    expect(tx.value).toBe('1000');
  });

  it('parses a native transfer as a raw transaction', async () => {
    const {
      transactions: [tx]
    } = await parseSafeImportFile(
      file([
        {
          to: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
          value: '1000000000000000000',
          data: '0x',
          contractMethod: null,
          contractInputsValues: null
        }
      ])
    );

    expect(tx._type).toBe('raw');
    expect(tx.to).toBe('0xeF8305E140ac520225DAf050e2f71d5fBcC543e7');
    expect(tx.value).toBe('1000000000000000000');
    expect(tx.data).toBe('0x');
  });

  it('throws on an empty or invalid file', async () => {
    await expect(parseSafeImportFile(file([]))).rejects.toThrow();
    await expect(parseSafeImportFile('not json')).rejects.toThrow();
  });

  it('throws when the chain does not match', async () => {
    await expect(
      parseSafeImportFile(
        file([{ to: '0x', value: '0', data: '0x' }], '1'),
        '100'
      )
    ).rejects.toThrow(/chain/);
  });
});

describe('checksum', () => {
  const exported = () =>
    addChecksum({
      version: '1.0',
      chainId: '1',
      createdAt: 0,
      meta: { name: 'batch' },
      transactions: [
        {
          to: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
          value: '1',
          data: '0x'
        }
      ]
    } as any);

  it('imports an unmodified export without warnings', async () => {
    const { transactions, warnings } = await parseSafeImportFile(
      JSON.stringify(exported())
    );

    expect(transactions).toHaveLength(1);
    expect(warnings).toEqual([]);
  });

  it('warns but still imports a file edited after export', async () => {
    const edited = exported();
    edited.transactions[0].value = '2';

    const { transactions, warnings } = await parseSafeImportFile(
      JSON.stringify(edited)
    );

    expect(transactions).toHaveLength(1);
    expect(warnings).toEqual([
      'This file was modified after it was exported (checksum mismatch)'
    ]);
  });
});

describe('scalar arguments', () => {
  const ABI = [
    {
      name: 'set',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'flag', type: 'bool' },
        { name: 'amount', type: 'uint256' },
        { name: 'names', type: 'string[]' }
      ],
      outputs: []
    }
  ];

  const encode = (flag: boolean, amount: string, names: string[]) =>
    new Interface(ABI).encodeFunctionData('set', [flag, amount, names]);

  const importOne = (values: Record<string, string>) =>
    parseSafeImportFile(
      file([
        {
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          value: '0',
          data: null,
          contractMethod: {
            name: 'set',
            payable: false,
            inputs: [
              { name: 'flag', type: 'bool' },
              { name: 'amount', type: 'uint256' },
              { name: 'names', type: 'string[]' }
            ]
          },
          contractInputsValues: values
        }
      ])
    );

  it.each([
    ['True', true],
    ['1', true],
    [' true ', true],
    ['false', false],
    ['0', false]
  ])('accepts the Safe bool spelling %j', async (flag, expected) => {
    const {
      transactions: [tx]
    } = await importOne({ flag, amount: '1', names: '["a"]' });

    expect(tx.data).toBe(encode(expected, '1', ['a']));
  });

  it('rejects an invalid bool spelling instead of encoding false', async () => {
    await expect(
      importOne({ flag: 'yes', amount: '1', names: '["a"]' })
    ).rejects.toThrow(/Transaction 1 in this file could not be imported/);
  });

  it.each(['"100"', ' 100 ', "'100'"])(
    'accepts the quoted or padded integer %j',
    async amount => {
      const {
        transactions: [tx]
      } = await importOne({ flag: 'true', amount, names: '["a"]' });

      expect(tx.data).toBe(encode(true, '100', ['a']));
    }
  );

  it('rejects an empty integer', async () => {
    await expect(
      importOne({ flag: 'true', amount: '', names: '["a"]' })
    ).rejects.toThrow(/Transaction 1 in this file could not be imported/);
  });

  it('parses a JSON string array, keeping commas inside strings', async () => {
    const {
      transactions: [tx]
    } = await importOne({
      flag: 'true',
      amount: '1',
      names: '["a,b", "c"]'
    });

    expect(tx.data).toBe(encode(true, '1', ['a,b', 'c']));
  });

  it("parses this app's bare comma-joined string array export", async () => {
    const {
      transactions: [tx]
    } = await importOne({ flag: 'true', amount: '1', names: 'a, b' });

    expect(tx.data).toBe(encode(true, '1', ['a', 'b']));
  });
});

describe('array arguments', () => {
  const RECIPIENTS_ABI = [
    {
      name: 'batchTransfer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'recipients', type: 'address[]' },
        { name: 'amounts', type: 'uint256[]' }
      ],
      outputs: []
    }
  ];

  const RECIPIENT_1 = '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70';
  const RECIPIENT_2 = '0x111111125421cA6dc452d289314280a0f8842A65';
  // Above 2^53: JSON.parse would round it to a lossy float.
  const BIG_AMOUNT = '10000000000000000000';

  const expected = new Interface(RECIPIENTS_ABI).encodeFunctionData(
    'batchTransfer',
    [
      [RECIPIENT_1, RECIPIENT_2],
      [BIG_AMOUNT, '2']
    ]
  );

  const importBatchTransfer = (values: Record<string, string>) =>
    parseSafeImportFile(
      file([
        {
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          value: '0',
          data: null,
          contractMethod: {
            name: 'batchTransfer',
            payable: false,
            inputs: [
              { name: 'recipients', type: 'address[]' },
              { name: 'amounts', type: 'uint256[]' }
            ]
          },
          contractInputsValues: values
        }
      ])
    );

  it('parses the Safe Transaction Builder unquoted bracketed form', async () => {
    const {
      transactions: [tx]
    } = await importBatchTransfer({
      recipients: `[${RECIPIENT_1}, ${RECIPIENT_2}]`,
      amounts: `[${BIG_AMOUNT}, 2]`
    });

    expect(tx.data).toBe(expected);
  });

  it("parses this app's own bare comma-joined export form", async () => {
    const {
      transactions: [tx]
    } = await importBatchTransfer({
      recipients: `${RECIPIENT_1}, ${RECIPIENT_2}`,
      amounts: `${BIG_AMOUNT}, 2`
    });

    expect(tx.data).toBe(expected);
  });

  it('still parses a JSON array (quoted elements)', async () => {
    const {
      transactions: [tx]
    } = await importBatchTransfer({
      recipients: JSON.stringify([RECIPIENT_1, RECIPIENT_2]),
      amounts: JSON.stringify([BIG_AMOUNT, '2'])
    });

    expect(tx.data).toBe(expected);
  });
});

describe('decoding imported transactions', () => {
  it('decodes raw calldata via the fetched contract ABI', async () => {
    vi.mocked(getABI).mockResolvedValueOnce(TRANSFER_ABI);

    const data = new Interface(TRANSFER_ABI).encodeFunctionData('transfer', [
      '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      '100'
    ]);

    const {
      transactions: [tx]
    } = await parseSafeImportFile(
      file([
        { to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', value: '0', data }
      ]),
      '1'
    );

    expect(tx._type).toBe('contractCall');
    expect((tx._form as any).method).toBe('transfer(address,uint256)');
    expect((tx._form as any).args).toEqual({
      to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      value: '100'
    });
    expect(tx.data).toBe(data);
  });

  it('falls back to a standard ERC20 ABI for unresolved proxies (e.g. USDC)', async () => {
    vi.mocked(getABI).mockRejectedValueOnce(new Error('not verified'));

    const data = new Interface([
      'function approve(address spender, uint256 amount)'
    ]).encodeFunctionData('approve', [
      '0x111111125421ca6dc452d289314280a0f8842a65',
      '100'
    ]);

    const {
      transactions: [tx]
    } = await parseSafeImportFile(
      file([
        { to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', value: '0', data }
      ]),
      '1'
    );

    expect(tx._type).toBe('contractCall');
    expect((tx._form as any).method).toBe('approve(address,uint256)');
  });

  it('falls back to raw when the ABI has unnamed inputs, preserving the original calldata', async () => {
    vi.mocked(getABI).mockResolvedValueOnce([
      'function f(uint256,uint256)'
    ] as any);

    const data = new Interface([
      'function f(uint256,uint256)'
    ]).encodeFunctionData('f', ['1', '2']);

    const {
      transactions: [tx]
    } = await parseSafeImportFile(
      file([
        { to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', value: '0', data }
      ]),
      '1'
    );

    expect(tx._type).toBe('raw');
    expect(tx.data).toBe(data);
  });

  it('falls back to raw with duplicate-named inputs, preserving the original calldata', async () => {
    vi.mocked(getABI).mockResolvedValueOnce([
      'function g(uint256 amount, uint256 amount)'
    ] as any);

    const data = new Interface([
      'function g(uint256 amount, uint256 amount)'
    ]).encodeFunctionData('g', ['1', '2']);

    const {
      transactions: [tx]
    } = await parseSafeImportFile(
      file([
        { to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', value: '0', data }
      ]),
      '1'
    );

    expect(tx._type).toBe('raw');
    expect(tx.data).toBe(data);
  });

  it('falls back to raw with the freshly encoded calldata when contractMethod inputs are unnamed and the file omits data', async () => {
    const {
      transactions: [tx]
    } = await parseSafeImportFile(
      file([
        {
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          value: '0',
          data: null,
          contractMethod: {
            name: 'f',
            payable: false,
            inputs: [
              { name: '', type: 'uint256' },
              { name: '', type: 'uint256' }
            ]
          },
          // Safe keys unnamed inputs by index.
          contractInputsValues: { '0': '1', '1': '1' }
        }
      ])
    );

    expect(tx._type).toBe('raw');
    expect(tx.data).not.toBe('0x');
    expect(tx.data).toBe(
      new Interface(['function f(uint256,uint256)']).encodeFunctionData('f', [
        '1',
        '1'
      ])
    );
  });
});

describe('calldata and value validation', () => {
  const importOne = (tx: Record<string, unknown>) =>
    parseSafeImportFile(
      file([
        {
          to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          value: '0',
          data: '0x',
          contractMethod: null,
          contractInputsValues: null,
          ...tx
        }
      ])
    );

  it('rejects numeric data (hashes silently as a single byte downstream)', async () => {
    await expect(importOne({ data: 123 })).rejects.toThrow(/invalid calldata/);
  });

  it('rejects odd-length hex data', async () => {
    await expect(importOne({ data: '0x1' })).rejects.toThrow(
      /invalid calldata/
    );
  });

  it('rejects a negative value', async () => {
    await expect(importOne({ value: '-1' })).rejects.toThrow(/invalid value/);
  });

  it.each([
    ['data', false],
    ['data', 0],
    ['value', false],
    ['value', 0]
  ])(
    'rejects a non-string %s (%j) instead of defaulting it',
    async (field, v) => {
      await expect(importOne({ [field]: v })).rejects.toThrow(/invalid/);
    }
  );

  it.each(['data', 'value'])('accepts an absent or empty %s', async field => {
    for (const v of [null, undefined, '']) {
      const { transactions } = await importOne({ [field]: v });

      expect(transactions).toHaveLength(1);
    }
  });
});

describe('file validation', () => {
  it('rejects a transaction with an invalid recipient address', async () => {
    await expect(
      parseSafeImportFile(
        file([{ to: 'not-an-address', value: '0', data: '0x' }])
      )
    ).rejects.toThrow(/Transaction 1 has an invalid recipient address/);
  });

  it('rejects a contract method whose input value is missing', async () => {
    await expect(
      parseSafeImportFile(
        file([
          {
            to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            value: '0',
            data: null,
            contractMethod: {
              name: 'transfer',
              payable: false,
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' }
              ]
            },
            contractInputsValues: {
              to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'
            }
          }
        ])
      )
    ).rejects.toThrow(/Transaction 1 in this file could not be imported/);
  });
});

describe('tuple arguments', () => {
  const ABI = [
    {
      name: 'setPair',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        {
          name: 'pair',
          type: 'tuple',
          components: [
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ]
        }
      ],
      outputs: []
    }
  ];

  const data = new Interface(ABI).encodeFunctionData('setPair', [
    ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '7']
  ]);

  it('survives an edit and re-save in the contract-call form', async () => {
    vi.mocked(getABI).mockResolvedValueOnce(ABI);

    const {
      transactions: [tx]
    } = await parseSafeImportFile(
      file([
        { to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', value: '0', data }
      ]),
      '1'
    );
    const resaved = await createContractCallTransaction({
      form: { ...(tx._form as any), to: tx.to }
    });

    expect(tx._type).toBe('contractCall');
    expect(resaved.data).toBe(data);
  });
});
