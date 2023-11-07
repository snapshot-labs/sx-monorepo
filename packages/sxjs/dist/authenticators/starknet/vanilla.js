"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const starknet_1 = require("starknet");
const Space_json_1 = __importDefault(require("../../clients/starknet/starknet-tx/abis/Space.json"));
const starknet_enums_1 = require("../../utils/starknet-enums");
const callData = new starknet_1.CallData(Space_json_1.default);
function createVanillaAuthenticator() {
    return {
        type: 'vanilla',
        createProposeCall(envelope, args) {
            const { space, authenticator } = envelope.data;
            const addressType = args.author.length === 42 ? 'ETHEREUM' : 'STARKNET';
            const calldata = callData.compile('propose', [
                (0, starknet_enums_1.getUserAddressEnum)(addressType, args.author),
                starknet_1.shortString.splitLongString(args.metadataUri),
                args.executionStrategy,
                args.strategiesParams
            ]);
            return {
                contractAddress: authenticator,
                entrypoint: 'authenticate',
                calldata: [space, starknet_1.hash.getSelectorFromName('propose'), calldata.length, ...calldata]
            };
        },
        createVoteCall(envelope, args) {
            const { space, authenticator } = envelope.data;
            const addressType = args.voter.length === 42 ? 'ETHEREUM' : 'STARKNET';
            const calldata = callData.compile('vote', [
                (0, starknet_enums_1.getUserAddressEnum)(addressType, args.voter),
                starknet_1.uint256.bnToUint256(args.proposalId),
                (0, starknet_enums_1.getChoiceEnum)(args.choice),
                args.votingStrategies,
                starknet_1.shortString.splitLongString(args.metadataUri)
            ]);
            return {
                contractAddress: authenticator,
                entrypoint: 'authenticate',
                calldata: [space, starknet_1.hash.getSelectorFromName('vote'), calldata.length, ...calldata]
            };
        },
        createUpdateProposalCall(envelope, args) {
            const { space, authenticator } = envelope.data;
            const addressType = args.author.length === 42 ? 'ETHEREUM' : 'STARKNET';
            const calldata = callData.compile('update_proposal', [
                (0, starknet_enums_1.getUserAddressEnum)(addressType, args.author),
                starknet_1.uint256.bnToUint256(args.proposalId),
                args.executionStrategy,
                starknet_1.shortString.splitLongString(args.metadataUri)
            ]);
            return {
                contractAddress: authenticator,
                entrypoint: 'authenticate',
                calldata: [space, starknet_1.hash.getSelectorFromName('update_proposal'), calldata.length, ...calldata]
            };
        }
    };
}
exports.default = createVanillaAuthenticator;
