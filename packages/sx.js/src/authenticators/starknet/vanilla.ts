import { Call, CallData, hash, shortString, uint256 } from 'starknet';
import SpaceAbi from '../../clients/starknet/starknet-tx/abis/Space.json';
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
import { getChoiceEnum, getUserAddressEnum } from '../../utils/starknet-enums';

const callData = new CallData(SpaceAbi);

export default function createVanillaAuthenticator(): Authenticator {
  return {
    type: 'vanilla',
    createProposeCall(
      envelope: Envelope<Propose>,
      args: ProposeCallArgs
    ): Call {
      const { space, authenticator } = envelope.data;

      const addressType = args.author.length === 42 ? 'ETHEREUM' : 'STARKNET';
      const calldata = callData.compile('propose', [
        getUserAddressEnum(addressType, args.author),
        shortString.splitLongString(args.metadataUri),
        args.executionStrategy,
        args.strategiesParams
      ]);

      return {
        contractAddress: authenticator,
        entrypoint: 'authenticate',
        calldata: [
          space,
          hash.getSelectorFromName('propose'),
          calldata.length,
          ...calldata
        ]
      };
    },
    createVoteCall(envelope: Envelope<Vote>, args: VoteCallArgs): Call {
      const { space, authenticator } = envelope.data;

      const addressType = args.voter.length === 42 ? 'ETHEREUM' : 'STARKNET';
      const calldata = callData.compile('vote', [
        getUserAddressEnum(addressType, args.voter),
        uint256.bnToUint256(args.proposalId),
        getChoiceEnum(args.choice),
        args.votingStrategies,
        shortString.splitLongString(args.metadataUri)
      ]);

      return {
        contractAddress: authenticator,
        entrypoint: 'authenticate',
        calldata: [
          space,
          hash.getSelectorFromName('vote'),
          calldata.length,
          ...calldata
        ]
      };
    },
    createUpdateProposalCall(
      envelope: Envelope<UpdateProposal>,
      args: UpdateProposalCallArgs
    ): Call {
      const { space, authenticator } = envelope.data;

      const addressType = args.author.length === 42 ? 'ETHEREUM' : 'STARKNET';
      const calldata = callData.compile('update_proposal', [
        getUserAddressEnum(addressType, args.author),
        uint256.bnToUint256(args.proposalId),
        args.executionStrategy,
        shortString.splitLongString(args.metadataUri)
      ]);

      return {
        contractAddress: authenticator,
        entrypoint: 'authenticate',
        calldata: [
          space,
          hash.getSelectorFromName('update_proposal'),
          calldata.length,
          ...calldata
        ]
      };
    }
  };
}
