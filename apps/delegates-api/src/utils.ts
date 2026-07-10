import { Delegate, Governance } from '../.checkpoint/models';

export const DECIMALS = 18;

export const BIGINT_ZERO = BigInt(0);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export async function getDelegate(
  indexerName: string,
  id: string,
  governanceId: string
): Promise<Delegate> {
  let delegate = await Delegate.loadEntity(
    `${governanceId}/${id}`,
    indexerName
  );

  if (!delegate) {
    delegate = new Delegate(`${governanceId}/${id}`, indexerName);
    delegate.governance = governanceId;
    delegate.user = id;

    if (id != ZERO_ADDRESS) {
      const governance = await getGovernance(indexerName, governanceId);
      governance.totalDelegates += 1;
      await governance.save();
    }
  }

  return delegate;
}

export async function getGovernance(
  indexerName: string,
  id: string
): Promise<Governance> {
  let governance = await Governance.loadEntity(id, indexerName);

  if (!governance) {
    governance = new Governance(id, indexerName);
    governance.currentDelegates = 0;
    governance.totalDelegates = 0;
  }

  return governance;
}
