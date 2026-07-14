import { evm } from '@snapshot-labs/checkpoint';
import { formatUnits } from 'viem';
import logger from '../logger';
import { BIGINT_ZERO, DECIMALS, getDelegate, getGovernance } from '../utils';
import GeneralPurposeFactoryAbi from './abis/GeneralPurposeFactory';
import TokenAbi from './abis/Token';
import { NetworkID } from './config';

const GENERIC_ERC20_VOTES_IMPLEM = '0x75DB1EEE7b03A0C9BcAD50Cb381B068c209c81ef'; // Address should be the same on all networks

export default function createWriters(indexerName: NetworkID) {
  const handleDelegateChanged: evm.Writer<
    typeof TokenAbi,
    'DelegateChanged'
  > = async ({ event, source }) => {
    if (!event) return;

    const governanceId = source?.contract || '';
    const fromDelegate = event.args.fromDelegate;
    const toDelegate = event.args.toDelegate;

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

  const handleDelegateVotesChanged: evm.Writer<
    typeof TokenAbi,
    'DelegateVotesChanged'
  > = async ({ event, source }) => {
    if (!event) return;

    const governanceId = source?.contract || '';
    const delegate = await getDelegate(
      indexerName,
      event.args.delegate,
      governanceId
    );
    const governance = await getGovernance(indexerName, governanceId);

    delegate.delegatedVotesRaw = event.args.newBalance.toString();
    delegate.delegatedVotes = formatUnits(event.args.newBalance, DECIMALS);
    await delegate.save();

    if (
      event.args.previousBalance === BIGINT_ZERO &&
      event.args.newBalance > BIGINT_ZERO
    )
      governance.currentDelegates += 1;

    if (event.args.newBalance === BIGINT_ZERO) governance.currentDelegates -= 1;

    const votesDiff = event.args.newBalance - event.args.previousBalance;
    governance.delegatedVotesRaw = (
      BigInt(governance.delegatedVotesRaw) + votesDiff
    ).toString();
    governance.delegatedVotes = formatUnits(
      BigInt(governance.delegatedVotesRaw),
      DECIMALS
    );

    await governance.save();
  };

  const handleContractDeployed: evm.Writer<
    typeof GeneralPurposeFactoryAbi,
    'ContractDeployed'
  > = async ({ blockNumber, event, helpers }) => {
    if (!event) return;

    if (event.args.implementation === GENERIC_ERC20_VOTES_IMPLEM) {
      await helpers.executeTemplate('GenericERC20Votes', {
        contract: event.args.contractAddress,
        start: blockNumber
      });
    } else {
      logger.warn(
        { implementation: event.args.implementation },
        'Unknown implementation'
      );
    }
  };

  return {
    handleDelegateChanged,
    handleDelegateVotesChanged,
    handleContractDeployed
  };
}
