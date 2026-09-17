import { Interface } from '@ethersproject/abi';
import { CallOverrides, Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { networks } from '@/helpers/networks';

export type CallOptions = CallOverrides & { limit?: number };

const MULTICALL3_ADDRESSES = '0xcA11bde05977b3631167028862bE2a173976CA11';

export const MULTICALL_ABI = [
  'function aggregate(tuple(address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)',
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[] returnData)'
];

export async function call(
  provider: Provider,
  abi: any[],
  call: any[],
  options?: CallOptions
) {
  const contract = new Contract(call[0], abi, provider);
  try {
    const params = call[2] || [];
    return await contract[call[1]](...params, options || {});
  } catch (err) {
    return Promise.reject(err);
  }
}

export async function multicall(
  network: string,
  provider: Provider,
  abi: any[],
  calls: any[],
  options?: CallOptions
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
    return results.map((call: string, i: number) =>
      itf.decodeFunctionResult(calls[i][1], call)
    );
  } catch (err) {
    return Promise.reject(err);
  }
}

export async function multicall3(
  provider: Provider,
  abi: any[],
  calls: [string, string, any[]?][],
  allowFailure: boolean,
  options?: CallOptions
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
    } catch (err) {
      console.error(err);
      return [false, null];
    }
  });
}
