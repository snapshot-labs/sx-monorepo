import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { Envelope, Propose, Vote } from '../types';
import GovernorBravoAbi from './abis/GovernorBravo.json';

type CallOptions = {
  noWait?: boolean;
};

export class EthereumTx {
  async vote(
    { signer, envelope }: { signer: Signer; envelope: Envelope<Vote> },
    opts: CallOptions = {}
  ) {
    const { spaceId, proposalId, choice, reason } = envelope.data;

    const contract = new Contract(spaceId, GovernorBravoAbi, signer);

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

    const contract = new Contract(spaceId, GovernorBravoAbi, signer);

    const promise = contract.propose(
      executions.map(execution => execution.to),
      executions.map(execution => execution.value),
      executions.map(execution => {
        if ('method' in execution._form) {
          return execution._form.method;
        }

        return '';
      }),
      executions.map(execution => {
        if ('method' in execution._form) {
          return `0x${execution.data.slice(10)}`;
        }

        return execution.data;
      }),
      `${title}\n\n${body}`
    );

    return opts.noWait ? null : promise;
  }

  async queue(
    {
      signer,
      spaceId,
      proposalId
    }: { signer: Signer; spaceId: string; proposalId: number },
    opts: CallOptions = {}
  ) {
    const contract = new Contract(spaceId, GovernorBravoAbi, signer);

    const promise = contract.queue(proposalId);

    return opts.noWait ? null : promise;
  }

  async execute(
    {
      signer,
      spaceId,
      proposalId
    }: { signer: Signer; spaceId: string; proposalId: number },
    opts: CallOptions = {}
  ) {
    const contract = new Contract(spaceId, GovernorBravoAbi, signer);

    const promise = contract.execute(proposalId);

    return opts.noWait ? null : promise;
  }
}
