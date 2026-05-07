import { Web3Provider } from '@ethersproject/providers';

type AtomicStatus = 'supported' | 'ready' | 'unsupported';

type CapabilitiesResponse = Record<
  string,
  { atomic?: { status?: AtomicStatus } }
>;

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

    const status = result?.[chainHex]?.atomic?.status;

    return status === 'supported' || status === 'ready';
  } catch {
    return false;
  }
}
