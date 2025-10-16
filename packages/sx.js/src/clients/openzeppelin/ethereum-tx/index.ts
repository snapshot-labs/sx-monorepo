import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { keccak256 } from '@ethersproject/keccak256';
import { toUtf8Bytes } from '@ethersproject/strings';
import { Envelope, Propose, Vote } from '../types';
import IGovernorAbi from './abis/IGovernor.json';
import { MetaTransaction } from '../../../utils/encoding';

type CallOptions = {
  noWait?: boolean;
};

export class EthereumTx {
  async vote(
    { signer, envelope }: { signer: Signer; envelope: Envelope<Vote> },
    opts: CallOptions = {}
  ) {
    const { spaceId, proposalId, choice, reason } = envelope.data;

    const contract = new Contract(spaceId, IGovernorAbi, signer);

    const promise = reason
      ? contract.castVoteWithReason(proposalId, choice, reason)
      : contract.castVote(proposalId, choice);

    return opts.noWait ? null : promise;
  }

  async propose(
    { signer, envelope }: { signer: Signer; envelope: Envelope<Propose> },
    opts: CallOptions = {}
  ) {
    const { spaceId, title, body, executions } = envelope.data;

    const contract = new Contract(spaceId, IGovernorAbi, signer);

    const promise = contract.propose(
      executions.map(execution => execution.to),
      executions.map(execution => execution.value),
      executions.map(execution => execution.data),
      `${title}\n\n${body}`
    );

    return opts.noWait ? null : promise;
  }

  async queue(
    {
      signer,
      spaceId,
      description,
      transactions
    }: {
      signer: Signer;
      spaceId: string;
      description: string;
      transactions: MetaTransaction[];
    },
    opts: CallOptions = {}
  ) {
    const contract = new Contract(spaceId, IGovernorAbi, signer);

    const promise = contract.queue(
      transactions.map(tx => tx.to),
      transactions.map(tx => tx.value),
      transactions.map(tx => tx.data),
      keccak256(toUtf8Bytes(description))
    );

    return opts.noWait ? null : promise;
  }

  async execute(
    {
      signer,
      spaceId,
      description,
      transactions
    }: {
      signer: Signer;
      spaceId: string;
      description: string;
      transactions: MetaTransaction[];
    },
    opts: CallOptions = {}
  ) {
    const contract = new Contract(spaceId, IGovernorAbi, signer);

    const promise = contract.execute(
      transactions.map(tx => tx.to),
      transactions.map(tx => tx.value),
      transactions.map(tx => tx.data),
      keccak256(toUtf8Bytes(description))
    );

    return opts.noWait ? null : promise;
  }
}
