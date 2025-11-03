import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { Envelope, Propose, Vote } from '../types';
import IGovernorV4Abi from './abis/IGovernorV4.json';
import IGovernorV5Abi from './abis/IGovernorV5.json';
import {
  getRSVFromSig,
  hexPadLeft,
  MetaTransaction
} from '../../../utils/encoding';

type CallOptions = {
  noWait?: boolean;
};

export class EthereumTx {
  async vote(
    { signer, envelope }: { signer: Signer; envelope: Envelope<Vote> },
    opts: CallOptions = {}
  ) {
    const { signatureData } = envelope;
    const { spaceId, proposalId, choice, reason } = envelope.data;

    const contract = new Contract(spaceId, IGovernorV5Abi, signer);

    let promise;
    if (signatureData) {
      const { authenticatorType, address, message, signature } = signatureData;
      if (authenticatorType === 'OpenZeppelinAuthenticatorSignatureV4') {
        const { r, s, v } = getRSVFromSig(signature);

        const contract = new Contract(spaceId, IGovernorV4Abi, signer);
        promise = contract.castVoteBySig(
          proposalId,
          choice,
          signature,
          v,
          hexPadLeft(r.toHex()),
          hexPadLeft(s.toHex())
        );
      } else if (authenticatorType === 'OpenZeppelinAuthenticatorSignatureV5') {
        promise = reason
          ? contract.castVoteWithReasonAndParamsBySig(
              proposalId,
              choice,
              address,
              reason,
              message.params,
              signature
            )
          : contract.castVoteBySig(proposalId, choice, address, signature);
      }
    } else {
      promise = reason
        ? contract.castVoteWithReason(proposalId, choice, reason)
        : contract.castVote(proposalId, choice);
    }

    return opts.noWait ? null : promise;
  }

  async propose(
    { signer, envelope }: { signer: Signer; envelope: Envelope<Propose> },
    opts: CallOptions = {}
  ) {
    const { spaceId, title, body, executions } = envelope.data;

    const contract = new Contract(spaceId, IGovernorV5Abi, signer);

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
      descriptionHash,
      transactions
    }: {
      signer: Signer;
      spaceId: string;
      descriptionHash: string;
      transactions: MetaTransaction[];
    },
    opts: CallOptions = {}
  ) {
    const contract = new Contract(spaceId, IGovernorV5Abi, signer);

    const promise = contract.queue(
      transactions.map(tx => tx.to),
      transactions.map(tx => tx.value),
      transactions.map(tx => tx.data),
      descriptionHash
    );

    return opts.noWait ? null : promise;
  }

  async execute(
    {
      signer,
      spaceId,
      descriptionHash,
      transactions
    }: {
      signer: Signer;
      spaceId: string;
      descriptionHash: string;
      transactions: MetaTransaction[];
    },
    opts: CallOptions = {}
  ) {
    const contract = new Contract(spaceId, IGovernorV5Abi, signer);

    const promise = contract.execute(
      transactions.map(tx => tx.to),
      transactions.map(tx => tx.value),
      transactions.map(tx => tx.data),
      descriptionHash
    );

    return opts.noWait ? null : promise;
  }
}
