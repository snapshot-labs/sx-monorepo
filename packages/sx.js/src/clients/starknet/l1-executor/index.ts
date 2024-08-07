import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import L1ExecutorContractAbi from './abis/L1AvatarExecutionStrategy.json';
import { MetaTransaction } from '../../../utils/encoding';

type ExecuteParams = {
  executor: string;
  space: string;
  proposalId: number;
  proposal: {
    startTimestamp: bigint;
    minEndTimestamp: bigint;
    maxEndTimestamp: bigint;
    finalizationStatus: 0 | 1 | 2;
    executionPayloadHash: string;
    executionStrategy: string;
    authorAddressType: 0 | 1 | 2;
    author: string;
    activeVotingStrategies: bigint;
  };
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstain: bigint;
  executionHash: string;
  transactions: MetaTransaction[];
};

export class L1Executor {
  async execute({
    signer,
    executor,
    space,
    proposalId,
    proposal,
    votesFor,
    votesAgainst,
    votesAbstain,
    executionHash,
    transactions
  }: {
    signer: Signer;
  } & ExecuteParams) {
    const contract = new Contract(executor, L1ExecutorContractAbi, signer);

    return contract.execute(
      space,
      proposalId,
      proposal,
      [votesFor, votesAgainst, votesAbstain],
      executionHash,
      transactions
    );
  }
}
