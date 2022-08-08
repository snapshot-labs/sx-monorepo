export interface Call {
  to: bigint;
  functionSelector: bigint;
  calldata: bigint[];
}

export function createStarknetExecutionParams(callArray: Call[]): bigint[] {
  if (!callArray || callArray.length == 0) {
    return [];
  }

  const dataOffset = BigInt(1 + callArray.length * 4);
  const executionParams = [dataOffset];
  let calldataIndex = 0;

  callArray.forEach((tx) => {
    const subArr: bigint[] = [
      tx.to,
      tx.functionSelector,
      BigInt(calldataIndex),
      BigInt(tx.calldata.length)
    ];
    calldataIndex += tx.calldata.length;
    executionParams.push(...subArr);
  });

  callArray.forEach((tx) => {
    executionParams.push(...tx.calldata);
  });
  return executionParams;
}
