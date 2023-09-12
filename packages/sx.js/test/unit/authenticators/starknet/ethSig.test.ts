import createEthSigAuthenticator from '../../../../src/authenticators/starknet/ethSig';
import { proposeEthSigEnvelope } from '../../fixtures';

describe('ethSigAuthenticator', () => {
  const ethSigAuthenticator = createEthSigAuthenticator();

  it('should return type', () => {
    expect(ethSigAuthenticator.type).toBe('ethSig');
  });

  it('should create call', () => {
    const call = ethSigAuthenticator.createProposeCall(proposeEthSigEnvelope, {
      author: '0x0538D033B879aC94C709c1E408CC081345427379',
      executionStrategy: {
        address: '0x04ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d',
        params: ['0x0']
      },
      strategiesParams: [],
      metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
    });

    expect(call).toEqual({
      calldata: [
        '21',
        '0',
        '42',
        '0',
        '1337',
        '3574172993065962590075873883995272904972485634822338681805127351511476165416',
        '29811932540321151122382281881294222217556685689',
        '2227609168297539246424361209537869283707901920511493173122155749125022247757',
        '1',
        '0',
        '0',
        '2',
        '186294699441980128189377377192603377168975971823877440252735361969625461826',
        '25964229224351537016195446666313628538517038335615841',
        '0',
        '0'
      ],
      contractAddress: '0x064cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14',
      entrypoint: 'authenticate_propose'
    });
  });
});
