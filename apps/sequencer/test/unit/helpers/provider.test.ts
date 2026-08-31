import { getProvider } from '../../../src/helpers/provider';

describe('getProvider()', () => {
  it('labels EVM requests with client=sequencer', () => {
    expect(getProvider('1').connection.url).toContain('/1?client=sequencer');
  });

  it('labels Starknet requests with client=sequencer', () => {
    expect(getProvider('0x534e5f4d41494e').channel.nodeUrl).toContain(
      '/sn?client=sequencer'
    );
  });
});
