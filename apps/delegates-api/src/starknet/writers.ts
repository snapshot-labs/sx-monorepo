import { starknet } from '@snapshot-labs/checkpoint';
import { validateAndParseAddress } from 'starknet';
import { formatUnits } from 'viem';
import { BIGINT_ZERO, DECIMALS, getDelegate, getGovernance } from '../utils';

export default function createWriters(indexerName: string) {
  const handleDelegateChanged: starknet.Writer = async ({ event, source }) => {
    if (!event) return;

    const governanceId = source?.contract || '';
    const fromDelegate = validateAndParseAddress(event.from_delegate);
    const toDelegate = validateAndParseAddress(event.to_delegate);

    const previousDelegate = await getDelegate(
      indexerName,
      fromDelegate,
      governanceId
    );
    previousDelegate.tokenHoldersRepresentedAmount -= 1;
    await previousDelegate.save();

    const newDelegate = await getDelegate(
      indexerName,
      toDelegate,
      governanceId
    );
    newDelegate.tokenHoldersRepresentedAmount += 1;
    await newDelegate.save();
  };

  const handleDelegateVotesChanged: starknet.Writer = async ({
    event,
    source
  }) => {
    if (!event) return;

    const governanceId = source?.contract || '';
    const delegate = await getDelegate(
      indexerName,
      validateAndParseAddress(event.delegate),
      governanceId
    );
    const governance = await getGovernance(indexerName, governanceId);

    delegate.delegatedVotesRaw = BigInt(event.new_votes).toString();
    delegate.delegatedVotes = formatUnits(BigInt(event.new_votes), DECIMALS);
    await delegate.save();

    if (event.previous_votes == BIGINT_ZERO && event.new_votes > BIGINT_ZERO)
      governance.currentDelegates += 1;

    if (event.new_votes == BIGINT_ZERO) governance.currentDelegates -= 1;

    const votesDiff = BigInt(event.new_votes) - BigInt(event.previous_votes);
    governance.delegatedVotesRaw = (
      BigInt(governance.delegatedVotesRaw) + votesDiff
    ).toString();
    governance.delegatedVotes = formatUnits(
      BigInt(governance.delegatedVotesRaw),
      DECIMALS
    );

    await governance.save();
  };

  return {
    handleDelegateChanged,
    handleDelegateVotesChanged
  };
}
