import { Account, ec, defaultProvider } from 'starknet';
import { getStarkKey } from 'starknet/utils/ellipticCurve';
import { verify } from '../../../src/utils/starkkey';
import { domain, voteTypes } from '../../../src/clients/starknet-sig/types';

describe('starkkey', () => {
  let starkKeyPair = ec.genKeyPair();
  const privKey = starkKeyPair.getPrivate('hex');
  starkKeyPair = ec.getKeyPair(`0x${privKey}`);
  const pubKey = starkKeyPair.getPublic('hex');
  const address = getStarkKey(starkKeyPair);
  const account = new Account(defaultProvider, address, starkKeyPair);
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
    const result = verify(pubKey, address, data, sig);
    expect(result).toBe(true);
  });
});
