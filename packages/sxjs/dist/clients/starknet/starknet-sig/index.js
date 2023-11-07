"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StarkNetSig = void 0;
const randombytes_1 = __importDefault(require("randombytes"));
const starknet_1 = require("starknet");
const strategies_1 = require("../../../utils/strategies");
const types_1 = require("./types");
const __1 = require("../../..");
class StarkNetSig {
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
    async send(envelope) {
        const body = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'send',
                params: { envelope },
                id: null
            })
        };
        const res = await fetch(`${this.config.manaUrl}/stark_rpc/${this.config.networkConfig.eip712ChainId}`, body);
        const json = await res.json();
        return json.result;
    }
    async sign(signer, verifyingContract, message, types, primaryType) {
        const domain = {
            ...types_1.baseDomain,
            chainId: this.config.networkConfig.eip712ChainId,
            verifyingContract
        };
        const data = {
            types,
            primaryType,
            domain,
            message
        };
        const signature = await signer.signMessage(data);
        return {
            address: signer.address,
            signature: Array.isArray(signature)
                ? signature.map(v => `0x${BigInt(v).toString(16)}`)
                : [`0x${signature.r.toString(16)}`, `0x${signature.s.toString(16)}`],
            message,
            primaryType
        };
    }
    async propose({ signer, data }) {
        const address = signer.address;
        const userStrategies = await (0, strategies_1.getStrategiesWithParams)('propose', data.strategies, address, data, this.config);
        const message = {
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
        const signatureData = await this.sign(signer, data.authenticator, message, types_1.proposeTypes, 'Propose');
        return {
            signatureData,
            data
        };
    }
    async updateProposal({ signer, data }) {
        const address = signer.address;
        const message = {
            space: data.space,
            author: address,
            proposalId: starknet_1.uint256.bnToUint256(data.proposal),
            executionStrategy: {
                address: data.executionStrategy.addr,
                params: data.executionStrategy.params
            },
            metadataUri: starknet_1.shortString
                .splitLongString(data.metadataUri)
                .map(str => starknet_1.shortString.encodeShortString(str)),
            salt: this.generateSalt()
        };
        const signatureData = await this.sign(signer, data.authenticator, message, types_1.updateProposalTypes, 'UpdateProposal');
        return {
            signatureData,
            data
        };
    }
    async vote({ signer, data }) {
        const address = signer.address;
        const userVotingStrategies = await (0, strategies_1.getStrategiesWithParams)('vote', data.strategies, address, data, this.config);
        const message = {
            space: data.space,
            voter: address,
            proposalId: starknet_1.uint256.bnToUint256(data.proposal),
            choice: `0x${data.choice.toString(16)}`,
            userVotingStrategies,
            metadataUri: starknet_1.shortString.splitLongString('').map(str => starknet_1.shortString.encodeShortString(str))
        };
        const signatureData = await this.sign(signer, data.authenticator, message, types_1.voteTypes, 'Vote');
        return {
            signatureData,
            data
        };
    }
}
exports.StarkNetSig = StarkNetSig;
