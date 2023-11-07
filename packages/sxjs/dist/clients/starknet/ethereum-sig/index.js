"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumSig = void 0;
const randombytes_1 = __importDefault(require("randombytes"));
const starknet_1 = require("starknet");
const strategies_1 = require("../../../utils/strategies");
const types_1 = require("./types");
const __1 = require("../../..");
const encoding_1 = require("../../../utils/encoding");
class EthereumSig {
    config;
    constructor(opts) {
        this.config = {
            networkConfig: __1.defaultNetwork,
            ...opts
        };
    }
    generateSalt() {
        return `0x${(0, randombytes_1.default)(4).toString('hex')}`;
    }
    async sign(signer, message, types, primaryType) {
        const address = await signer.getAddress();
        const domain = {};
        const extendedMessage = {
            chainId: this.config.networkConfig.eip712ChainId,
            ...message
        };
        const signature = await signer._signTypedData(domain, types, extendedMessage);
        const { r, s, v } = (0, encoding_1.getRSVFromSig)(signature);
        return {
            address,
            signature: [r.toHex(), s.toHex(), v],
            message: extendedMessage,
            primaryType
        };
    }
    async propose({ signer, data }) {
        const address = await signer.getAddress();
        const userStrategies = await (0, strategies_1.getStrategiesWithParams)('propose', data.strategies, address, data, this.config);
        const message = {
            authenticator: data.authenticator,
            space: data.space,
            author: address,
            executionStrategy: {
                address: data.executionStrategy.addr,
                params: data.executionStrategy.params
            },
            userProposalValidationParams: starknet_1.CallData.compile({
                userStrategies
            }),
            metadataUri: starknet_1.shortString
                .splitLongString(data.metadataUri)
                .map(str => starknet_1.shortString.encodeShortString(str)),
            salt: this.generateSalt()
        };
        const signatureData = await this.sign(signer, message, types_1.proposeTypes, 'Propose');
        return {
            signatureData,
            data
        };
    }
    async updateProposal({ signer, data }) {
        const address = await signer.getAddress();
        const message = {
            authenticator: data.authenticator,
            space: data.space,
            author: address,
            proposalId: `0x${data.proposal.toString(16)}`,
            executionStrategy: {
                address: data.executionStrategy.addr,
                params: data.executionStrategy.params
            },
            metadataUri: starknet_1.shortString
                .splitLongString(data.metadataUri)
                .map(str => starknet_1.shortString.encodeShortString(str)),
            salt: this.generateSalt()
        };
        const signatureData = await this.sign(signer, message, types_1.updateProposalTypes, 'UpdateProposal');
        return {
            signatureData,
            data
        };
    }
    async vote({ signer, data }) {
        const address = await signer.getAddress();
        const userVotingStrategies = await (0, strategies_1.getStrategiesWithParams)('vote', data.strategies, address, data, this.config);
        const message = {
            authenticator: data.authenticator,
            space: data.space,
            voter: address,
            proposalId: `0x${data.proposal.toString(16)}`,
            choice: `0x${data.choice.toString(16)}`,
            userVotingStrategies,
            metadataUri: starknet_1.shortString.splitLongString('').map(str => starknet_1.shortString.encodeShortString(str))
        };
        const signatureData = await this.sign(signer, message, types_1.voteTypes, 'Vote');
        return {
            signatureData,
            data
        };
    }
}
exports.EthereumSig = EthereumSig;
