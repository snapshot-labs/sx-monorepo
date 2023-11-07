"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const starknet_1 = require("starknet");
const StarkSigAuthenticator_json_1 = __importDefault(require("./abis/StarkSigAuthenticator.json"));
const starknet_enums_1 = require("../../utils/starknet-enums");
const callData = new starknet_1.CallData(StarkSigAuthenticator_json_1.default);
function createStarkSigAuthenticator() {
    return {
        type: 'starkSig',
        createProposeCall(envelope, args) {
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
                starknet_1.shortString.splitLongString(args.metadataUri),
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
        createVoteCall(envelope, args) {
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
                starknet_1.uint256.bnToUint256(args.proposalId),
                (0, starknet_enums_1.getChoiceEnum)(args.choice),
                args.votingStrategies.map(strategy => ({
                    index: strategy.index,
                    params: strategy.params
                })),
                starknet_1.shortString.splitLongString(args.metadataUri)
            ]);
            return {
                contractAddress: authenticator,
                entrypoint: 'authenticate_vote',
                calldata: compiled
            };
        },
        createUpdateProposalCall(envelope, args) {
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
                starknet_1.uint256.bnToUint256(args.proposalId),
                {
                    address: args.executionStrategy.address,
                    params: args.executionStrategy.params
                },
                starknet_1.shortString.splitLongString(args.metadataUri),
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
exports.default = createStarkSigAuthenticator;
