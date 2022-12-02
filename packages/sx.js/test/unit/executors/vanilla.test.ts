import { vanillaExecutor } from '../../../src/executors';

describe('vanillaExecutor', () => {
  const address = '0x4ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d';

  it('should create execution data', () => {
    const data = vanillaExecutor.getExecutionData(address);

    expect(data).toEqual({
      executor: address,
      executionParams: []
    });
  });
});
