"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const starknet_1 = require("starknet");
const EthSigAuthenticator_json_1 = __importDefault(require("./abis/EthSigAuthenticator.json"));
const starknet_enums_1 = require("../../utils/starknet-enums");
const callData = new starknet_1.CallData(EthSigAuthenticator_json_1.default);
function createEthSigAuthenticator() {
    return {
        type: 'ethSig',
        createProposeCall(envelope, args) {
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
            const { space, authenticator } = envelope.data;
            if (!envelope.signatureData?.signature) {
                throw new Error('signature is required for this authenticator');
            }
            if (!envelope.signatureData?.message) {
                throw new Error('message is required for this authenticator');
            }
            const [r, s, v] = envelope.signatureData.signature;
            const compiled = callData.compile('authenticate_vote', [
                r,
                s,
                v,
                space,
                args.voter,
                args.proposalId,
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
                {
                    address: args.author
                },
                args.proposalId,
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
exports.default = createEthSigAuthenticator;
