import { Interface } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';
import { createExecutionHash } from '../../utils/encoding/execution-hash';
import { SplitUint256 } from '../../utils/split-uint256';
import { defaultNetwork } from '../../networks';
import ZodiacAbi from './abis/zodiac.json';
import type { MetaTransaction } from '../../utils/encoding/execution-hash';
import type { ExecutionInput, NetworkConfig } from '../../types';

export class Zodiac {
  config: { networkConfig: NetworkConfig; wallet: Wallet };

  zodiacInterface: Interface;

  constructor(opts: { networkConfig?: NetworkConfig; wallet: Wallet }) {
    this.config = {
      networkConfig: defaultNetwork,
      ...opts
    };

    this.zodiacInterface = new Interface(ZodiacAbi);
  }

  async receiveProposal(space: string, executor: string, input?: ExecutionInput) {
    if (!input?.transactions) throw new Error('Expected transactions in input');

    const executorConfig = this.config.networkConfig.executors[executor];
    if (executorConfig?.type !== 'ethRelayer') throw new Error('Expected ethRelayer executor');

    const { destination, chainId } = executorConfig.params;

    const zodiacModule = new Contract(destination, this.zodiacInterface, this.config.wallet);

    const { executionHash, txHashes } = createExecutionHash(
      input.transactions,
      destination,
      chainId
    );
    const executionHashSplit = SplitUint256.fromHex(executionHash);

    const proposalOutcome = 1;

    return zodiacModule.receiveProposal(
      space,
      proposalOutcome,
      executionHashSplit.low,
      executionHashSplit.high,
      txHashes
    );
  }

  async executeProposalTx(proposalIndex: number, executor: string, transaction: MetaTransaction) {
    const executorConfig = this.config.networkConfig.executors[executor];
    if (executorConfig?.type !== 'ethRelayer') throw new Error('Expected ethRelayer executor');

    const { destination } = executorConfig.params;

    const zodiacModule = new Contract(destination, this.zodiacInterface, this.config.wallet);

    return zodiacModule.executeProposalTx(
      proposalIndex,
      transaction.to,
      transaction.value,
      transaction.data,
      transaction.operation
    );
  }
}
