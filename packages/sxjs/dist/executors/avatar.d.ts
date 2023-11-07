import type { MetaTransaction } from '../utils/encoding/execution-hash';
export default function createAvatarExecutor(): {
    type: string;
    getExecutionData(executorAddress: string, transactions: MetaTransaction[]): {
        executor: string;
        executionParams: string[];
    };
};
