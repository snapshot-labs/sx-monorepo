import { getStorageVarAddress } from '../../../../src/utils/encoding';

describe('storageVars', () => {
  describe('getStorageVarAddress', () => {
    it('should calculate address for strage var with no arguments', () => {
      const address = getStorageVarAddress('Voting_num_voting_strategies_store');

      expect(address).toBe(
        '1132603603708845750901293048689264183551203819688552254429518139992977083884'
      );
    });

    it('should calculate address with arguments', () => {
      const address = getStorageVarAddress(
        'Voting_voting_strategy_params_store',
        '0x344a63d1f5cd0e5f707fede9886d5dd306e86eba91ea410b416f39e44c3865',
        '0x0'
      );

      expect(address).toBe(
        '3489048192089559476903748062948486950202000883027513154877959712418600200866'
      );
    });
  });
});
