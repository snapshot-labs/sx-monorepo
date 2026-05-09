import { Web3Provider } from '@ethersproject/providers';

type AtomicStatus = 'supported' | 'ready' | 'unsupported';

export type Eip5792Call = {
  to: string;
  data: string;
  value?: string;
};

type SendCallsResult = string | { id: string };

type CallsStatusResponse = {
  status: number;
  receipts?: { transactionHash: string }[];
};

type AtomicCapability = { status?: AtomicStatus };

type LegacyAtomicCapability = { supported?: boolean };

type CapabilitiesResponse = Record<
  string,
  {
    atomic?: AtomicCapability | string;
    atomicBatch?: LegacyAtomicCapability;
  }
>;

const STATUS_CONFIRMED_MIN = 200;
const STATUS_FAILURE_MIN = 300;

function parseAtomicCapability(
  raw: AtomicCapability | string | undefined
): AtomicCapability | undefined {
  if (typeof raw !== 'string') return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function hasAtomicBatchSupport(
  provider: Pick<Web3Provider, 'send'>,
  account: string,
  chainId: number
): Promise<boolean> {
  const chainHex = `0x${chainId.toString(16)}`;

  try {
    const result = (await provider.send('wallet_getCapabilities', [
      account,
      [chainHex]
    ])) as CapabilitiesResponse | undefined;

    const capability = result?.[chainHex];
    const atomic = parseAtomicCapability(capability?.atomic);
    const status = atomic?.status;

    if (status === 'supported' || status === 'ready') return true;

    return capability?.atomicBatch?.supported === true;
  } catch {
    return false;
  }
}

export async function sendBatchedCalls(
  provider: Pick<Web3Provider, 'send'>,
  account: string,
  chainId: number,
  calls: Eip5792Call[]
): Promise<string> {
  const result = (await provider.send('wallet_sendCalls', [
    {
      version: '2.0.0',
      chainId: `0x${chainId.toString(16)}`,
      from: account,
      atomicRequired: true,
      calls
    }
  ])) as SendCallsResult;

  return typeof result === 'string' ? result : result.id;
}

export async function waitForCallsBundle(
  provider: Pick<Web3Provider, 'send'>,
  bundleId: string,
  options: { pollIntervalMs?: number } = {}
): Promise<string> {
  const interval = options.pollIntervalMs ?? 2000;

  while (true) {
    const result = (await provider.send('wallet_getCallsStatus', [
      bundleId
    ])) as CallsStatusResponse;

    if (
      result.status >= STATUS_CONFIRMED_MIN &&
      result.status < STATUS_FAILURE_MIN
    ) {
      const hash = result.receipts?.[0]?.transactionHash;
      if (!hash) throw new Error('Bundle confirmed but no receipts returned');

      return hash;
    }

    if (result.status >= STATUS_FAILURE_MIN) {
      throw new Error(`Bundle execution failed (status ${result.status})`);
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }
}
