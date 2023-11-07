"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const starknet_1 = require("starknet");
const EthTxAuthenticator_json_1 = __importDefault(require("./abis/EthTxAuthenticator.json"));
const starknet_enums_1 = require("../../utils/starknet-enums");
const callData = new starknet_1.CallData(EthTxAuthenticator_json_1.default);
function createEthTxAuthenticator() {
    return {
        type: 'ethTx',
        createProposeCall(envelope, args) {
            const { space, authenticator } = envelope.data;
            const compiled = callData.compile('authenticate_propose', [
                space,
                args.author,
                starknet_1.shortString.splitLongString(args.metadataUri),
                {
                    address: args.executionStrategy.address,
                    params: args.executionStrategy.params
                },
                args.strategiesParams
            ]);
            return {
                contractAddress: authenticator,
                entrypoint: 'authenticate_propose',
                calldata: compiled
            };
        },
        createVoteCall(envelope, args) {
            const { space, authenticator } = envelope.data;
            const compiled = callData.compile('authenticate_vote', [
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
            const compiled = callData.compile('authenticate_update_proposal', [
                space,
                args.author,
                args.proposalId,
                {
                    address: args.executionStrategy.address,
                    params: args.executionStrategy.params
                },
                starknet_1.shortString.splitLongString(args.metadataUri)
            ]);
            return {
                contractAddress: authenticator,
                entrypoint: 'authenticate_update_proposal',
                calldata: compiled
            };
        }
    };
}
exports.default = createEthTxAuthenticator;
