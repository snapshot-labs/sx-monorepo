import { MetaTransaction } from '../utils/encoding';
export default function createEthRelayerExecutor({ destination }: {
    destination: string;
}): {
    type: string;
    getExecutionData(executorAddress: string, transactions: MetaTransaction[]): {
        executor: string;
        executionParams: string[];
    };
};
