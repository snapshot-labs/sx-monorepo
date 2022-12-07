export default function createVanillaExecutor() {
  return {
    type: 'vanilla',
    getExecutionData(executorAddress: string) {
      return {
        executor: executorAddress,
        executionParams: []
      };
    }
  };
}
