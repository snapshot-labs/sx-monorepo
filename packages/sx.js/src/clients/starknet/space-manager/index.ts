import { getExecutionData } from '../../../executors';
import { defaultNetwork } from '../../../networks';
import { strToShortStringArr } from '../../../utils/strings';
import type { Account } from 'starknet';
import type { ClientOpts, ClientConfig, ExecutionInput } from '../../../types';

export class SpaceManager {
  config: Omit<ClientConfig, 'ethUrl'> & {
    account: Account;
  };

  constructor(opts: Omit<ClientOpts, 'ethUrl'> & { account: Account }) {
    this.config = {
      networkConfig: defaultNetwork,
      ...opts
    };
  }

  async setMetadataUri(space: string, metadataUri: string) {
    const metadataUriArr = strToShortStringArr(metadataUri);

    const call = {
      contractAddress: space,
      entrypoint: 'setMetadataUri',
      calldata: [metadataUriArr.length, ...metadataUriArr.map(v => `0x${v.toString(16)}`)]
    };

    const fee = await this.config.account.estimateFee(call);
    return this.config.account.execute(call, undefined, {
      maxFee: fee.suggestedMaxFee
    });
  }

  async finalizeProposal(
    space: string,
    proposalId: number,
    executor: string,
    input?: ExecutionInput
  ) {
    const { executionParams } = getExecutionData(executor, this.config.networkConfig, input);

    const call = {
      contractAddress: space,
      entrypoint: 'finalizeProposal',
      calldata: [proposalId, executionParams.length, ...executionParams]
    };

    const fee = await this.config.account.estimateFee(call);
    return this.config.account.execute(call, undefined, {
      maxFee: fee.suggestedMaxFee
    });
  }
}
