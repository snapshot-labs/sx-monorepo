import { Call, CallData, shortString } from 'starknet';
import EthSigAuthenticatorAbi from './abis/EthSigAuthenticator.json';
import {
  Authenticator,
  Envelope,
  Propose,
  ProposeCallArgs,
  UpdateProposal,
  UpdateProposalCallArgs,
  Vote,
  VoteCallArgs
} from '../../clients/starknet/types';
import { getChoiceEnum } from '../../utils/starknet-enums';

const callData = new CallData(EthSigAuthenticatorAbi);

export default function createEthSigAuthenticator(): Authenticator {
  return {
    type: 'ethSig',
    createProposeCall(
      envelope: Envelope<Propose>,
      args: ProposeCallArgs
    ): Call {
      const { space, authenticator } = envelope.data;

      if (!envelope.signatureData?.signature) {
        throw new Error('signature is required for this authenticator');
      }

      if (!envelope.signatureData?.message) {
        throw new Error('message is required for this authenticator');
      }

      const [r, s, v] = envelope.signatureData.signature;

      const compiled = callData.compile('authenticate_propose', [
        r,
        s,
        v,
        space,
        args.author,
        shortString.splitLongString(args.metadataUri),
        {
          address: args.executionStrategy.address,
          params: args.executionStrategy.params
        },
        args.strategiesParams,
        envelope.signatureData.message.salt
      ]);

      return {
        contractAddress: authenticator,
        entrypoint: 'authenticate_propose',
        calldata: compiled
      };
    },
    createVoteCall(envelope: Envelope<Vote>, args: VoteCallArgs): Call {
      const { space, authenticator } = envelope.data;

      if (!envelope.signatureData?.signature) {
        throw new Error('signature is required for this authenticator');
      }

      if (!envelope.signatureData?.message) {
        throw new Error('message is required for this authenticator');
      }

      const [r, s, v] = envelope.signatureData.signature;
      if (!r || !s || !v)
        throw new Error('signature needs to contain r, s and v');

      const compiled = callData.compile('authenticate_vote', [
        r,
        s,
        v,
        space,
        args.voter,
        args.proposalId,
        getChoiceEnum(args.choice),
        args.votingStrategies.map(strategy => ({
          index: strategy.index,
          params: strategy.params
        })),
        shortString.splitLongString(args.metadataUri)
      ]);

      return {
        contractAddress: authenticator,
        entrypoint: 'authenticate_vote',
        calldata: compiled
      };
    },
    createUpdateProposalCall(
      envelope: Envelope<UpdateProposal>,
      args: UpdateProposalCallArgs
    ): Call {
      const { space, authenticator } = envelope.data;

      if (!envelope.signatureData?.signature) {
        throw new Error('signature is required for this authenticator');
      }

      if (!envelope.signatureData?.message) {
        throw new Error('message is required for this authenticator');
      }

      const [r, s, v] = envelope.signatureData.signature;

      const compiled = callData.compile('authenticate_update_proposal', [
        r,
        s,
        v,
        space,
        args.author,
        args.proposalId,
        {
          address: args.executionStrategy.address,
          params: args.executionStrategy.params
        },
        shortString.splitLongString(args.metadataUri),
        envelope.signatureData.message.salt
      ]);

      return {
        contractAddress: authenticator,
        entrypoint: 'authenticate_update_proposal',
        calldata: compiled
      };
    }
  };
}
