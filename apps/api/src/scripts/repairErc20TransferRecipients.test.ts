import { describe, expect, it } from 'vitest';
import {
  buildUpdateStatement,
  decodeTransferRecipient,
  findRepairs
} from './repairErc20TransferRecipients';

// Verbatim row served by api.snapshot.box for ENS proposal
// 80619211450810140112687536515944199882433060764177806587986222097717655810120
// ("[Executable] Next Era of ENS DAO: Empowering the ENS Foundation"). The
// calldata transfers 1,000,000 ENS to the DAO Safe at 0x9C7dB6B1..., but the
// stored recipient is the ENS token contract.
const ENS_ROW = JSON.stringify([
  {
    _type: 'sendToken',
    _form: {
      recipient: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
      token: {
        name: 'Ethereum Name Service',
        symbol: 'ENS',
        decimals: 18,
        address: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72'
      },
      amount: '1000000000000000000000000'
    },
    to: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
    data: '0xa9059cbb0000000000000000000000009c7db6b1085ec4d07f75c0bd91ad3fcd368fa19e00000000000000000000000000000000000000000000d3c21bcecceda1000000',
    value: '0',
    salt: '0'
  }
]);

const ENS_SAFE = '0x9C7dB6B1085ec4D07f75c0BD91AD3FcD368fA19E';

describe('decodeTransferRecipient', () => {
  it('reads the recipient out of a transfer calldata', () => {
    expect(
      decodeTransferRecipient(
        '0xa9059cbb0000000000000000000000009c7db6b1085ec4d07f75c0bd91ad3fcd368fa19e00000000000000000000000000000000000000000000d3c21bcecceda1000000'
      )
    ).toEqual(ENS_SAFE);
  });

  it('ignores a non-transfer selector', () => {
    expect(
      decodeTransferRecipient(
        '0x5c19a95c0000000000000000000000008bf6f9f91d70a9a3c2fce45df30ece735c54d624'
      )
    ).toBeNull();
  });

  it('ignores native transfers', () => {
    expect(decodeTransferRecipient('0x')).toBeNull();
  });

  // Uniswap Governor Bravo proposal 81 supplied both a `transfer(address,uint256)`
  // signature and a calldata that already carried the selector, so the payload
  // the Governor executes -- and the one we index -- is double-prefixed and not
  // a well-formed transfer. Verified on chain via getActions(81).
  it('ignores a malformed transfer with a doubled selector', () => {
    expect(
      decodeTransferRecipient(
        '0xa9059cbba9059cbb0000000000000000000000005069a64bc6616dec1584ee0500b7813a9b680f7e00000000000000000000000000000000000000000010cf035cc2441ead340000'
      )
    ).toBeNull();
  });
});

describe('findRepairs', () => {
  it('finds the wrong recipient on the ENS row', () => {
    expect(findRepairs(ENS_ROW)).toEqual([
      {
        index: 0,
        from: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
        to: ENS_SAFE
      }
    ]);
  });

  it('skips a row that is already correct', () => {
    const correct = ENS_ROW.replace(
      '"recipient":"0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72"',
      `"recipient":"${ENS_SAFE}"`
    );

    expect(findRepairs(correct)).toEqual([]);
  });

  it('leaves a native ETH send alone', () => {
    const nativeSend = JSON.stringify([
      {
        _type: 'sendToken',
        _form: {
          recipient: ENS_SAFE,
          token: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
          },
          amount: '1000000000000000000'
        },
        to: ENS_SAFE,
        data: '0x',
        value: '1000000000000000000',
        salt: '0'
      }
    ]);

    expect(findRepairs(nativeSend)).toEqual([]);
  });

  it('leaves the malformed Uniswap 81 row alone', () => {
    const malformed = JSON.stringify([
      {
        _type: 'sendToken',
        _form: {
          recipient: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
          token: {
            name: 'Uniswap',
            symbol: 'UNI',
            decimals: 18,
            address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
          },
          amount:
            '70292350548291724087579333418938105353535870998214404425820445900356809016350'
        },
        to: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        data: '0xa9059cbba9059cbb0000000000000000000000005069a64bc6616dec1584ee0500b7813a9b680f7e00000000000000000000000000000000000000000010cf035cc2441ead340000',
        value: '0',
        salt: '0'
      }
    ]);

    expect(findRepairs(malformed)).toEqual([]);
  });

  it('leaves contractCall and raw transactions alone', () => {
    const other = JSON.stringify([
      { _type: 'contractCall', to: '0x1', data: '0xdeadbeef', value: '0' },
      { _type: 'raw', to: '0x2', data: '0xdeadbeef', value: '0' }
    ]);

    expect(findRepairs(other)).toEqual([]);
  });

  it('reports the array index so multi-transaction rows stay addressable', () => {
    const twoTransfers = JSON.stringify([
      { _type: 'contractCall', to: '0x1', data: '0xdeadbeef', value: '0' },
      JSON.parse(ENS_ROW)[0]
    ]);

    expect(findRepairs(twoTransfers)).toEqual([
      {
        index: 1,
        from: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
        to: ENS_SAFE
      }
    ]);
  });

  it('returns nothing on unparseable input', () => {
    expect(findRepairs('not json')).toEqual([]);
  });
});

describe('buildUpdateStatement', () => {
  it('rewrites one path, guarded on the value it expects to find', () => {
    const sql = buildUpdateStatement('a/1_metadata', {
      index: 0,
      from: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72',
      to: ENS_SAFE
    });

    expect(sql).toEqual(
      [
        'UPDATE proposalmetadataitems',
        `SET execution = jsonb_set(execution::jsonb, '{0,_form,recipient}', '"${ENS_SAFE}"'::jsonb)::text`,
        `WHERE id = 'a/1_metadata'`,
        '  AND upper_inf(block_range)',
        `  AND execution::jsonb #>> '{0,_form,recipient}' = '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72';`
      ].join('\n')
    );
  });

  it('escapes single quotes in the id', () => {
    const sql = buildUpdateStatement("it's", {
      index: 2,
      from: '0xa',
      to: '0xb'
    });

    expect(sql).toContain(`id = 'it''s'`);
    expect(sql).toContain(`'{2,_form,recipient}'`);
  });
});
