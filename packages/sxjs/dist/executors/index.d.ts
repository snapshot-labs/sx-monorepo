import { ExecutorType, ExecutionInput } from '../types';
export declare function getExecutionData(type: ExecutorType, executorAddress: string, input?: ExecutionInput): {
    executor: string;
    executionParams: string[];
};
