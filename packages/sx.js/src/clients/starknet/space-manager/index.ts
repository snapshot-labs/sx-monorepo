import { getExecutionData } from '../../../executors';
import { defaultNetwork } from '../../../networks';
import { SplitUint256 } from '../../../utils/split-uint256';
import { strToShortStringArr } from '../../../utils/strings';
import { flatten2DArray } from '../../../utils/encoding/calldata';
import type { Account } from 'starknet';
import type { ClientOpts, ClientConfig, ExecutionInput } from '../../../types';

export class SpaceManager {
  config: Omit<ClientConfig, 'ethUrl'> & {
    account: Account;
    disableEstimation: boolean;
  };

  constructor(
    opts: Omit<ClientOpts, 'ethUrl'> & { account: Account; disableEstimation?: boolean }
  ) {
    this.config = {
      networkConfig: defaultNetwork,
      ...opts,
      disableEstimation: !!opts.disableEstimation
    };
  }

  async execute(call: Parameters<Account['execute']>[0]) {
    if (this.config.disableEstimation) {
      return this.config.account.execute(call);
    }

    const fee = await this.config.account.estimateFee(call);
    return this.config.account.execute(call, undefined, {
      maxFee: fee.suggestedMaxFee
    });
  }

  async deploySpace(params: {
    controller: string;
    votingDelay: number;
    minVotingDuration: number;
    maxVotingDuration: number;
    proposalThreshold: bigint;
    qorum: bigint;
    authenticators: string[];
    votingStrategies: string[];
    votingStrategiesParams: string[][];
    executionStrategies: string[];
    metadataUri: string;
  }) {
    const quorum = SplitUint256.fromUint(params.qorum);
    const proposalThreshold = SplitUint256.fromUint(params.proposalThreshold);
    const metadataUriArr = strToShortStringArr(params.metadataUri);
    const votingStrategyParamsFlat = flatten2DArray(params.votingStrategiesParams);

    return this.execute({
      contractAddress: this.config.networkConfig.spaceFactory,
      entrypoint: 'deploySpace',
      calldata: [
        0,
        params.votingDelay,
        params.minVotingDuration,
        params.maxVotingDuration,
        proposalThreshold.low,
        proposalThreshold.high,
        params.controller,
        quorum.low,
        quorum.high,
        params.votingStrategies.length,
        ...params.votingStrategies,
        votingStrategyParamsFlat.length,
        ...votingStrategyParamsFlat,
        params.authenticators.length,
        ...params.authenticators,
        params.executionStrategies.length,
        ...params.executionStrategies,
        metadataUriArr.length,
        ...metadataUriArr
      ]
    });
  }

  async setMetadataUri(space: string, metadataUri: string) {
    const metadataUriArr = strToShortStringArr(metadataUri);

    return this.execute({
      contractAddress: space,
      entrypoint: 'setMetadataUri',
      calldata: [metadataUriArr.length, ...metadataUriArr.map(v => `0x${v.toString(16)}`)]
    });
  }

  async finalizeProposal(
    space: string,
    proposalId: number,
    executor: string,
    input?: ExecutionInput
  ) {
    const { executionParams } = getExecutionData(executor, this.config.networkConfig, input);

    return this.execute({
      contractAddress: space,
      entrypoint: 'finalizeProposal',
      calldata: [proposalId, executionParams.length, ...executionParams]
    });
  }
}
