export interface StarknetMetaTransaction {
  to: bigint;
  functionSelector: bigint;
  calldata: bigint[];
}

export function createStarknetExecutionParams(txArray: StarknetMetaTransaction[]): bigint[] {
  if (!txArray || txArray.length == 0) {
    return [];
  }

  const dataOffset = BigInt(1 + txArray.length * 4);
  const executionParams = [dataOffset];
  let calldataIndex = 0;

  txArray.forEach((tx) => {
    const subArr: bigint[] = [
      tx.to,
      tx.functionSelector,
      BigInt(tx.calldata.length),
      BigInt(calldataIndex)
    ];
    calldataIndex += tx.calldata.length;
    executionParams.push(...subArr);
  });

  txArray.forEach((tx) => {
    executionParams.push(...tx.calldata);
  });
  return executionParams;
}
