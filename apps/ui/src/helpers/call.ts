import { Interface } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';

const MULTICALL3_ADDRESSES = '0xcA11bde05977b3631167028862bE2a173976CA11';

export const MULTICALL_ABI = [
  'function aggregate(tuple(address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)',
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[] returnData)'
];

export async function call(provider, abi: any[], call: any[], options?) {
  const contract = new Contract(call[0], abi, provider);
  try {
    const params = call[2] || [];
    return await contract[call[1]](...params, options || {});
  } catch (e) {
    return Promise.reject(e);
  }
}

export async function multicall(
  network: string,
  provider,
  abi: any[],
  calls: any[],
  options?
) {
  const multi = new Contract(
    networks[network].multicall,
    MULTICALL_ABI,
    provider
  );
  const itf = new Interface(abi);
  try {
    const max = options?.limit || 500;
    const pages = Math.ceil(calls.length / max);
    const promises: any = [];
    Array.from(Array(pages)).forEach((x, i) => {
      const callsInPage = calls.slice(max * i, max * (i + 1));
      promises.push(
        multi.aggregate(
          callsInPage.map(call => [
            call[0].toLowerCase(),
            itf.encodeFunctionData(call[1], call[2])
          ]),
          options || {}
        )
      );
    });
    let results: any = await Promise.all(promises);
    results = results.reduce((prev: any, [, res]: any) => prev.concat(res), []);
    return results.map((call, i) =>
      itf.decodeFunctionResult(calls[i][1], call)
    );
  } catch (e) {
    return Promise.reject(e);
  }
}

export async function multicall3(
  provider,
  abi: any[],
  calls: [string, string, any[]?][],
  allowFailure: boolean,
  options?
) {
  const multi = new Contract(MULTICALL3_ADDRESSES, MULTICALL_ABI, provider);

  const itf = new Interface(abi);
  const max = options?.limit || 500;
  const pages = Math.ceil(calls.length / max);

  const promises: any = [];
  Array.from(Array(pages)).forEach((x, i) => {
    const callsInPage = calls.slice(max * i, max * (i + 1));

    promises.push(
      multi.aggregate3(
        callsInPage.map(call => {
          const target = call[0].toLowerCase();
          const callData = itf.encodeFunctionData(call[1], call[2]);

          return [target, allowFailure, callData];
        }),
        options || {}
      )
    );
  });

  const results = await Promise.all(promises);
  return results.flat().map((call, i) => {
    const [success, returnData] = call;

    try {
      const decoded = success
        ? itf.decodeFunctionResult(calls[i][1], returnData)
        : null;
      return [success, decoded];
    } catch (e) {
      console.error(e);
      return [false, null];
    }
  });
}
