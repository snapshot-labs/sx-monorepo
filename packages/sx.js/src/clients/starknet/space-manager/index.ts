import { getExecutionData } from '../../../executors';
import { defaultNetwork } from '../../../networks';
import { strToShortStringArr } from '../../../utils/strings';
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
