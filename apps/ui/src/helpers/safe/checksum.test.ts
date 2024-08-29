// https://github.com/safe-global/safe-react-apps/blob/c1dff3f93b9de05b3cbbc0627a466038f3571a66/apps/tx-builder/src/lib/checksum.ts
import { expect, it } from 'vitest';
import { addChecksum, validateChecksum } from './checksum';

const batchFileObject = {
  version: '1.0',
  chainId: '4',
  createdAt: 1646321521061,
  meta: {
    name: 'test batch file',
    txBuilderVersion: '1.4.0',
    checksum: '',
    createdFromSafeAddress: '0xDF8a1Ce35c9a6ACE153B4e0767942f1E2291a1Aa',
    createdFromOwnerAddress: '0x49d4450977E2c95362C13D3a31a09311E0Ea26A6'
  },
  transactions: [
    {
      to: '0x49d4450977E2c95362C13D3a31a09311E0Ea26A6',
      value: '0',
      contractMethod: {
        inputs: [
          {
            internalType: 'address',
            name: 'paramAddress',
            type: 'address'
          }
        ],
        name: 'testAddress',
        payable: false
      },
      contractInputsValues: {
        paramAddress: '0x49d4450977E2c95362C13D3a31a09311E0Ea26A6'
      }
    },
    {
      to: '0x49d4450977E2c95362C13D3a31a09311E0Ea26A6',
      value: '0',
      contractMethod: {
        inputs: [
          {
            internalType: 'bool',
            name: 'paramBool',
            type: 'bool'
          }
        ],
        name: 'testBool',
        payable: false
      },
      contractInputsValues: {
        paramAddress: '',
        paramBool: 'false'
      }
    },
    {
      to: '0x49d4450977E2c95362C13D3a31a09311E0Ea26A6',
      value: '2000000000000000000',
      data: '0x42f4579000000000000000000000000049d4450977e2c95362c13d3a31a09311e0ea26a6'
    }
  ]
};

it('adds checksum to BatchFile', () => {
  const batchFileWithChecksum = addChecksum(batchFileObject as any);
  expect(batchFileWithChecksum.meta.checksum).toBe(
    '0x4ecbfd364aa6759983915644e73f8bd411e85a2dc306f252a387c2728c4db64c'
  );
});

it('validates checksum in BatchFile', () => {
  // not sure why adding checksum and then validating it causes it to have different checksum
  // but that's how upstream does it.
  const batchFileWithChecksum = addChecksum(batchFileObject as any);
  expect(
    validateChecksum(
      batchFileWithChecksum,
      '0x832ecdb6653751ed00b79dede73864163e46e71815b72e11e506d6399bedffc9'
    )
  );
});
