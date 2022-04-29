import { getContractsFromConfig } from '../../../../src/checkpoint/utils/checkpoint';
import { validCheckpointConfig } from '../../../fixtures/checkpointConfig.fixture';

describe('getContractsFromConfig', () => {
  it('should work', () => {
    expect(getContractsFromConfig(validCheckpointConfig)).toMatchSnapshot();
  });
});
