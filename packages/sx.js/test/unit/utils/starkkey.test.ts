import { Account, ec, defaultProvider } from 'starknet';
import { verify } from '../../../src/utils/starkkey';
import { domain, voteTypes } from '../../../src/clients/starknet/starknet-sig/types';

describe('starkkey', () => {
  const privKey = ec.starkCurve.utils.randomPrivateKey();
  const pubKey = ec.starkCurve.getPublicKey(privKey);
  const address = ec.starkCurve.getStarkKey(privKey);
  const account = new Account(defaultProvider, address, privKey);
  // console.log('Privkey', privKey);
  // console.log('Pubkey', pubKey);
  // console.log('Address', address);

  it('starkkey.verify()', async () => {
    const message = {
      space: '0x0625dc1290b6e936be5f1a3e963cf629326b1f4dfd5a56738dea98e1ad31b7f3',
      proposal: 2,
      choice: 3
    };
    const data = { types: voteTypes, primaryType: 'Vote', domain, message };
    const sig = await account.signMessage(data);
    const result = verify(Buffer.from(pubKey).toString('hex'), address, data, sig);
    expect(result).toBe(true);
  });
});
