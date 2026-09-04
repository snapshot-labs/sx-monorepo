import { Interface } from '@ethersproject/abi';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getABI } from '@/helpers/etherscan';
import { createContractCallTransaction } from '@/helpers/transactions';
import { buildBatchFile } from './build';
import { addChecksum } from './checksum';
import { parseSafeImportFile, SafeImportError } from './transactions';

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
      ]),
      '1'
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
      ]),
      '1'
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
      ]),
      '1'
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
      ]),
      '1'
    );

    expect(tx._type).toBe('raw');
    expect(tx.to).toBe('0xeF8305E140ac520225DAf050e2f71d5fBcC543e7');
    expect(tx.value).toBe('1000000000000000000');
    expect(tx.data).toBe('0x');
  });

  it('throws on an empty or invalid file', async () => {
    await expect(parseSafeImportFile(file([]), '1')).rejects.toThrow();
    await expect(parseSafeImportFile('not json', '1')).rejects.toThrow(
      new SafeImportError('This file is not valid JSON')
    );
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
      JSON.stringify(exported()),
      '1'
    );

    expect(transactions).toHaveLength(1);
    expect(warnings).toEqual([]);
  });

  it('warns but still imports a file edited after export', async () => {
    const edited = exported();
    edited.transactions[0].value = '2';

    const { transactions, warnings } = await parseSafeImportFile(
      JSON.stringify(edited),
      '1'
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
      ]),
      '1'
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
      ]),
      '1'
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

  it('falls back to raw when a decoded string[] element contains a comma (lossy on edit+save)', async () => {
    vi.mocked(getABI).mockResolvedValueOnce([
      'function setNames(string[] names)'
    ] as any);

    const data = new Interface([
      'function setNames(string[] names)'
    ]).encodeFunctionData('setNames', [['a,b', 'c']]);

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

  it('still decodes as an editable contractCall when a string[] has no commas', async () => {
    vi.mocked(getABI).mockResolvedValueOnce([
      'function setNames(string[] names)'
    ] as any);

    const data = new Interface([
      'function setNames(string[] names)'
    ]).encodeFunctionData('setNames', [['a', 'b']]);

    const {
      transactions: [tx]
    } = await parseSafeImportFile(
      file([
        { to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', value: '0', data }
      ]),
      '1'
    );

    expect(tx._type).toBe('contractCall');
  });

  it('falls back to raw for a decoded empty array, preserving calldata across export/re-import', async () => {
    vi.mocked(getABI).mockResolvedValueOnce([
      'function setNames(string[] names)'
    ] as any);

    const data = new Interface([
      'function setNames(string[] names)'
    ]).encodeFunctionData('setNames', [[]]);

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

    const exported = buildBatchFile(1, [tx] as any);
    const reimported = await parseSafeImportFile(JSON.stringify(exported), '1');

    expect(reimported.transactions[0].data).toBe(data);
  });

  it('falls back to raw for a decoded empty array of a non-string element type', async () => {
    vi.mocked(getABI).mockResolvedValueOnce([
      'function setAmounts(uint256[] amounts)'
    ] as any);

    const data = new Interface([
      'function setAmounts(uint256[] amounts)'
    ]).encodeFunctionData('setAmounts', [[]]);

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

  it('falls back to raw for a decoded bool[] (the bare form cannot carry booleans)', async () => {
    vi.mocked(getABI).mockResolvedValueOnce([
      'function setFlags(bool[] flags)'
    ] as any);

    const data = new Interface([
      'function setFlags(bool[] flags)'
    ]).encodeFunctionData('setFlags', [[false, true]]);

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

  it('falls back to raw for a fixed-size array (always throws on re-save)', async () => {
    vi.mocked(getABI).mockResolvedValueOnce([
      'function setPair(uint256[2] pair)'
    ] as any);

    const data = new Interface([
      'function setPair(uint256[2] pair)'
    ]).encodeFunctionData('setPair', [['1', '2']]);

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

  it('falls back to raw for a nested array (always throws on re-save)', async () => {
    vi.mocked(getABI).mockResolvedValueOnce([
      'function setMatrix(address[][] matrix)'
    ] as any);

    const data = new Interface([
      'function setMatrix(address[][] matrix)'
    ]).encodeFunctionData('setMatrix', [
      [
        ['0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'],
        ['0x111111125421cA6dc452d289314280a0f8842A65']
      ]
    ]);

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
      ]),
      '1'
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

describe('decoded bool scalar arguments', () => {
  it.each([false, true])(
    'keeps a decoded bool argument (%s) as a real boolean via the ABI-decode path',
    async flag => {
      vi.mocked(getABI).mockResolvedValueOnce([
        'function setFlag(bool flag)'
      ] as any);

      const data = new Interface([
        'function setFlag(bool flag)'
      ]).encodeFunctionData('setFlag', [flag]);

      const {
        transactions: [tx]
      } = await parseSafeImportFile(
        file([
          { to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', value: '0', data }
        ]),
        '1'
      );

      expect(tx._type).toBe('contractCall');
      expect((tx._form as any).args).toEqual({ flag });
    }
  );

  it.each(['false', 'true'])(
    'keeps a bool argument (%s) from a Safe file contractMethod entry as a real boolean',
    async spelling => {
      const {
        transactions: [tx]
      } = await parseSafeImportFile(
        file([
          {
            to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            value: '0',
            data: null,
            contractMethod: {
              name: 'setFlag',
              payable: false,
              inputs: [{ name: 'flag', type: 'bool' }]
            },
            contractInputsValues: { flag: spelling }
          }
        ]),
        '1'
      );

      expect(tx._type).toBe('contractCall');
      expect((tx._form as any).args).toEqual({ flag: spelling === 'true' });
    }
  );
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
      ]),
      '1'
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
  it('rejects a malformed (non-object) transaction entry', async () => {
    await expect(parseSafeImportFile(file([null]), '1')).rejects.toThrow(
      /Transaction 1 is malformed/
    );
  });

  it('rejects a transaction with an invalid recipient address', async () => {
    await expect(
      parseSafeImportFile(
        file([{ to: 'not-an-address', value: '0', data: '0x' }]),
        '1'
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
        ]),
        '1'
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

  it('stores plain values, not the raw ethers Result (BigNumber JSON)', async () => {
    vi.mocked(getABI).mockResolvedValueOnce(ABI);

    const {
      transactions: [tx]
    } = await parseSafeImportFile(
      file([
        { to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', value: '0', data }
      ]),
      '1'
    );

    expect((tx._form as any).args.pair).toBe(
      JSON.stringify(
        ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '7'],
        null,
        2
      )
    );
  });

  it('exports plain values in contractInputsValues', async () => {
    vi.mocked(getABI).mockResolvedValueOnce(ABI);

    const { transactions } = await parseSafeImportFile(
      file([
        { to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', value: '0', data }
      ]),
      '1'
    );
    const exported = buildBatchFile(1, transactions as any);

    expect(exported.transactions[0].contractInputsValues?.pair).toBe(
      JSON.stringify(
        ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '7'],
        null,
        2
      )
    );
  });
});

describe('export round-trip', () => {
  // Any ERC-721 ABI overloads safeTransferFrom; the export must pick the
  // decoded overload, not the first one with that name.
  const ABI = [
    'function safeTransferFrom(address from, address to, uint256 tokenId)',
    'function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)'
  ];

  it('re-imports a decoded call against an overloaded ABI byte-identical', async () => {
    vi.mocked(getABI).mockResolvedValueOnce(
      new Interface(ABI).fragments.map(fragment =>
        JSON.parse(fragment.format('json'))
      )
    );
    const data = new Interface(ABI).encodeFunctionData(
      'safeTransferFrom(address,address,uint256,bytes)',
      [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        '1',
        '0xdeadbeef'
      ]
    );

    const { transactions } = await parseSafeImportFile(
      file([
        { to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', value: '0', data }
      ]),
      '1'
    );
    const exported = buildBatchFile(1, transactions as any);
    const reimported = await parseSafeImportFile(JSON.stringify(exported), '1');

    expect(
      exported.transactions[0].contractMethod?.inputs.map(i => i.name)
    ).toEqual(['from', 'to', 'tokenId', 'data']);
    expect(reimported.transactions[0].data).toBe(data);
  });

  it('brackets array args so the Safe Transaction Builder can parse them', async () => {
    const ARRAY_ABI = [
      'function batchNotify(address[] recipients, string[] names)'
    ];
    vi.mocked(getABI).mockResolvedValueOnce(
      new Interface(ARRAY_ABI).fragments.map(fragment =>
        JSON.parse(fragment.format('json'))
      )
    );
    const data = new Interface(ARRAY_ABI).encodeFunctionData('batchNotify', [
      [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'
      ],
      ['alice', 'bob']
    ]);

    const { transactions } = await parseSafeImportFile(
      file([
        { to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', value: '0', data }
      ]),
      '1'
    );
    const exported = buildBatchFile(1, transactions as any);

    // Bracketed, unquoted: what Safe's own parseArrayOfValues requires.
    expect(exported.transactions[0].contractInputsValues?.recipients).toBe(
      '[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70]'
    );
    // string[] must additionally be valid JSON (Safe's isArrayOfStringsFieldType).
    expect(exported.transactions[0].contractInputsValues?.names).toBe(
      JSON.stringify(['alice', 'bob'])
    );

    const reimported = await parseSafeImportFile(JSON.stringify(exported), '1');
    expect(reimported.transactions[0].data).toBe(data);
  });

  it('keeps quote characters that are part of a string[] element on export', async () => {
    const ARRAY_ABI = ['function setNames(string[] names)'];
    vi.mocked(getABI).mockResolvedValueOnce(
      new Interface(ARRAY_ABI).fragments.map(fragment =>
        JSON.parse(fragment.format('json'))
      )
    );
    const data = new Interface(ARRAY_ABI).encodeFunctionData('setNames', [
      ['"alice"', 'bob']
    ]);

    const { transactions } = await parseSafeImportFile(
      file([
        { to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', value: '0', data }
      ]),
      '1'
    );
    const exported = buildBatchFile(1, transactions as any);

    expect(exported.transactions[0].contractInputsValues?.names).toBe(
      JSON.stringify(['"alice"', 'bob'])
    );

    const reimported = await parseSafeImportFile(JSON.stringify(exported), '1');
    expect(reimported.transactions[0].data).toBe(data);
  });

  it('falls back to raw calldata for a bare method name ambiguous on an overloaded ABI', () => {
    const data = new Interface(ABI).encodeFunctionData(
      'safeTransferFrom(address,address,uint256)',
      [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        '1'
      ]
    );

    const tx = {
      to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      data,
      value: '0',
      salt: '',
      _type: 'contractCall',
      _form: {
        recipient: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        method: 'safeTransferFrom',
        args: {
          from: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
          tokenId: '1'
        },
        abi: ABI
      }
    } as any;

    let exported: ReturnType<typeof buildBatchFile>;
    expect(() => {
      exported = buildBatchFile(1, [tx]);
    }).not.toThrow();

    expect(exported!.transactions[0].data).toBe(data);
    expect(exported!.transactions[0].contractMethod).toBeUndefined();
  });
});

describe('bool argument export', () => {
  const ABI = ['function setFlag(bool flag)'];

  it.each([false, true])(
    'stringifies a form-built bool arg (%s) so the re-import round-trips the calldata',
    async flag => {
      const tx = await createContractCallTransaction({
        form: {
          to: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
          abi: ABI,
          method: 'setFlag(bool)',
          args: { flag },
          amount: '0'
        }
      });

      const exported = buildBatchFile(1, [tx as any]);
      expect(exported.transactions[0].contractInputsValues?.flag).toBe(
        String(flag)
      );

      const reimported = await parseSafeImportFile(
        JSON.stringify(exported),
        '1'
      );
      expect(reimported.transactions[0].data).toBe(tx.data);
    }
  );
});
