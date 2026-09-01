const mockGetSpaceUri = jest.fn();
const mockGetSpaceController = jest.fn();

jest.mock('@snapshot-labs/snapshot.js', () => {
  const originalModule = jest.requireActual('@snapshot-labs/snapshot.js');

  return {
    ...originalModule,
    utils: {
      ...originalModule.utils,
      getSpaceUri: (...args: unknown[]) => mockGetSpaceUri(...args),
      getSpaceController: (...args: unknown[]) =>
        mockGetSpaceController(...args)
    }
  };
});

jest.mock('@snapshot-labs/snapshot-sentry', () => ({
  capture: jest.fn()
}));

import poke from '../../../src/helpers/poke';
import {
  EvmProvider,
  getProvider,
  PROVIDER_OPTIONS,
  StarknetProvider
} from '../../../src/helpers/provider';
import { getSpaceController } from '../../../src/helpers/utils';

describe('getProvider()', () => {
  it('labels EVM requests with client=sequencer', () => {
    expect((getProvider('1') as EvmProvider).connection.url).toContain(
      '/1?client=sequencer'
    );
  });

  it('labels Starknet requests with client=sequencer', () => {
    expect(
      (getProvider('0x534e5f4d41494e') as StarknetProvider).channel.nodeUrl
    ).toContain('/sn?client=sequencer');
  });
});

describe('PROVIDER_OPTIONS call sites', () => {
  const DEFAULT_NETWORK = process.env.DEFAULT_NETWORK ?? '1';

  it('poke() labels the ENS space URI lookup with client=sequencer', async () => {
    mockGetSpaceUri.mockRejectedValueOnce(new Error('boom'));

    await expect(poke('test.eth')).rejects.toMatch(
      'unable to resolve space uri'
    );
    expect(mockGetSpaceUri).toHaveBeenCalledWith(
      'test.eth',
      DEFAULT_NETWORK,
      PROVIDER_OPTIONS
    );
  });

  it('getSpaceController() labels the space controller lookup with client=sequencer', async () => {
    mockGetSpaceController.mockResolvedValueOnce('0xcontroller');

    await expect(getSpaceController('test.eth')).resolves.toBe('0xcontroller');
    expect(mockGetSpaceController).toHaveBeenCalledWith(
      'test.eth',
      DEFAULT_NETWORK,
      PROVIDER_OPTIONS
    );
  });
});
