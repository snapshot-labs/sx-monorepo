export interface Call {
  to: string;
  functionSelector: string;
  calldata: string[];
}

export function createStarknetExecutionParams(callArray: Call[]): string[] {
  if (!callArray || callArray.length == 0) {
    return [];
  }

  const dataOffset = `0x${(1 + callArray.length * 4).toString(16)}`;
  const executionParams = [dataOffset];
  let calldataIndex = 0;

  callArray.forEach((tx) => {
    const subArr: string[] = [
      tx.to,
      tx.functionSelector,
      `0x${calldataIndex.toString(16)}`,
      `0x${tx.calldata.length.toString(16)}`
    ];
    calldataIndex += tx.calldata.length;
    executionParams.push(...subArr);
  });

  callArray.forEach((tx) => {
    executionParams.push(...tx.calldata);
  });
  return executionParams;
}
