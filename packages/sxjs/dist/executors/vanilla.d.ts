export default function createVanillaExecutor(): {
    type: string;
    getExecutionData(executorAddress: string): {
        executor: string;
        executionParams: never[];
    };
};
