export const vanillaExecutor = {
  type: 'vanilla',
  getExecutionData(executorAddress: string) {
    return {
      executor: executorAddress,
      executionParams: []
    };
  }
};
