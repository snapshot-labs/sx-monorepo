import { hash, Call } from 'starknet';

export function createStarknetExecutionParams(callArray: Call[]): string[] {
  if (!callArray || callArray.length == 0) {
    return [];
  }

  const dataOffset = `0x${(1 + callArray.length * 4).toString(16)}`;
  const executionParams = [dataOffset];
  let calldataIndex = 0;

  callArray.forEach(tx => {
    const calldata = tx.calldata || [];

    const subArr: string[] = [
      tx.contractAddress,
      hash.getSelectorFromName(tx.entrypoint),
      `0x${calldataIndex.toString(16)}`,
      `0x${calldata.length.toString(16)}`
    ];
    calldataIndex += calldata.length;
    executionParams.push(...subArr);
  });

  callArray.forEach(tx => {
    if (!tx.calldata) return;

    executionParams.push(
      ...tx.calldata.map(value => {
        if (typeof value === 'string') return value;

        return `0x${value.toString(16)}`;
      })
    );
  });

  return executionParams;
}
