import { Call, CallData, shortString, uint256 } from 'starknet';
import StarkSigAuthenticatorAbi from './abis/StarkSigAuthenticator.json';
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

const callData = new CallData(StarkSigAuthenticatorAbi);

export default function createStarkSigAuthenticator(): Authenticator {
  return {
    type: 'starkSig',
    createProposeCall(
      envelope: Envelope<Propose>,
      args: ProposeCallArgs
    ): Call {
      const { authenticator } = envelope.data;

      if (!envelope.signatureData?.signature) {
        throw new Error('signature is required for this authenticator');
      }

      if (!envelope.signatureData?.message) {
        throw new Error('message is required for this authenticator');
      }

      const compiled = callData.compile('authenticate_propose', [
        envelope.signatureData.signature,
        envelope.data.space,
        envelope.signatureData.address,
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
      const { authenticator } = envelope.data;

      if (!envelope.signatureData?.signature) {
        throw new Error('signature is required for this authenticator');
      }

      if (!envelope.signatureData?.message) {
        throw new Error('message is required for this authenticator');
      }

      const compiled = callData.compile('authenticate_vote', [
        envelope.signatureData.signature,
        envelope.data.space,
        envelope.signatureData.address,
        uint256.bnToUint256(args.proposalId),
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
      const { authenticator } = envelope.data;

      if (!envelope.signatureData?.signature) {
        throw new Error('signature is required for this authenticator');
      }

      if (!envelope.signatureData?.message) {
        throw new Error('message is required for this authenticator');
      }

      const compiled = callData.compile('authenticate_update_proposal', [
        envelope.signatureData.signature,
        envelope.data.space,
        envelope.signatureData.address,
        uint256.bnToUint256(args.proposalId),
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
