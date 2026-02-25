import { Account } from 'starknet';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { StarknetSig } from '../../../../../src/clients/offchain/starknet-sig';
import { offchainStarknetSepolia } from '../../../../../src/offchainNetworks';
import { starkProvider } from '../../../helpers';

describe('StarknetSig', () => {
  const address =
    '0x7d2f37b75a5e779f7da01c22acee1b66c39e8ba470ee5448f05e1462afcedb4';
  const privateKey = '0xcd613e30d8f16adf91b7584a2265b1f5';

  const account = new Account(starkProvider, address, privateKey);

  const client = new StarknetSig({ networkConfig: offchainStarknetSepolia });

  beforeAll(() => {
    vi.useFakeTimers({
      now: new Date('2024-01-21').getTime()
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should create setAlias envelope', async () => {
    const envelope = await client.setAlias({
      signer: account,
      data: {
        alias: '0xdeadbeef'
      }
    });

    expect(envelope).toMatchSnapshot();
  });
});
