import { describe, expect, it } from 'vitest';
import { parseStarknetError } from './starknet-rpc';

const ERROR_WITH_EXECUTION_ERROR = {
  jsonrpc: '2.0',
  error: {
    code: 500,
    message: 'unauthorized',
    data: {
      baseError: {
        code: 41,
        data: {
          execution_error: {
            class_hash:
              '0x1a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003',
            contract_address:
              '0x57b633edd3b075774d7084e410dab2f85af8a6acc28d103b6fb62a56683604',
            error: {
              class_hash:
                '0x6cd9cbb9ec3d8b9b65bfe957ec5a8554baeadb931e9b73dfbd9cdecc7268c8e',
              contract_address:
                '0x213bb25044b189ccfda9882999dba32e011781dc11b2a6efa2b3d232824378e',
              error: {
                class_hash: '0x0',
                contract_address:
                  '0x4338b28e9df1c40f890a6da32436091af9b36f5e55ebdf0dade046e1a67f545',
                error:
                  'Requested contract address 0x04338b28e9df1c40f890a6da32436091af9b36f5e55ebdf0dade046e1a67f545 is not deployed.\n',
                selector:
                  '0xfe80f537b66d12a00b6d3c072b44afbb716e78dde5c3f0ef116ee93d3e3283'
              },
              selector:
                '0x1896bcc195b7543d3f7145b0214a57857f52ee169b5f3d48ab2b9ad5bd747f5'
            },
            selector:
              '0x15d40a3d6ca2ac30f4031e42be28da9b056fef9bb7357ac5e85627ee876e5ad'
          },
          transaction_index: 0
        },
        message: 'Transaction execution error'
      }
    }
  },
  id: null
};

const ERROR_WITHOUT_EXECUTION_ERROR = {
  jsonrpc: '2.0',
  error: {
    code: 500,
    message: 'unauthorized',
    data: {
      baseError: {
        code: 41,
        message: 'Transaction execution error'
      }
    }
  },
  id: null
};

describe('parseStarknetError', () => {
  it('should parse error with execution error', () => {
    const parsed = parseStarknetError(ERROR_WITH_EXECUTION_ERROR);

    expect(parsed).toBe(
      'Requested contract address 0x04338b28e9df1c40f890a6da32436091af9b36f5e55ebdf0dade046e1a67f545 is not deployed.\n'
    );
  });

  it('should parse error without execution error', () => {
    const parsed = parseStarknetError(ERROR_WITHOUT_EXECUTION_ERROR);

    expect(parsed).toBe('Transaction execution error');
  });

  it('should return null for non-matching error structure', () => {
    const parsed = parseStarknetError({ some: 'random', structure: true });

    expect(parsed).toBeNull();
  });
});
