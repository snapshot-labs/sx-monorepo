"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumSig = void 0;
const randombytes_1 = __importDefault(require("randombytes"));
const abi_1 = require("@ethersproject/abi");
const split_uint256_1 = require("../../../utils/split-uint256");
const bytes_1 = require("../../../utils/bytes");
const evm_1 = require("../../../strategies/evm");
const networks_1 = require("../../../networks");
const types_1 = require("./types");
class EthereumSig {
    manaUrl;
    networkConfig;
    constructor(opts) {
        this.networkConfig = opts?.networkConfig || networks_1.evmGoerli;
        this.manaUrl = opts?.manaUrl || 'https://mana.pizza';
    }
    generateSalt() {
        return Number(split_uint256_1.SplitUint256.fromHex((0, bytes_1.bytesToHex)((0, randombytes_1.default)(4))).toHex());
    }
    async sign(signer, verifyingContract, message, types) {
        const address = await signer.getAddress();
        const domain = {
            ...types_1.domain,
            chainId: this.networkConfig.eip712ChainId,
            verifyingContract
        };
        const signature = await signer._signTypedData(domain, types, message);
        return {
            address,
            signature,
            domain,
            types,
            message
        };
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
        const res = await fetch(`${this.manaUrl}/eth_rpc/${this.networkConfig.eip712ChainId}`, body);
        const json = await res.json();
        return json.result;
    }
    async propose({ signer, data }) {
        const author = await signer.getAddress();
        const userStrategies = await (0, evm_1.getStrategiesWithParams)('propose', data.strategies, author, data, this.networkConfig);
        const abiCoder = new abi_1.AbiCoder();
        const message = {
            space: data.space,
            author,
            metadataURI: data.metadataUri,
            executionStrategy: data.executionStrategy,
            userProposalValidationParams: abiCoder.encode(['tuple(int8 index, bytes params)[]'], [userStrategies]),
            salt: this.generateSalt()
        };
        const signatureData = await this.sign(signer, data.authenticator, message, types_1.proposeTypes);
        return {
            signatureData,
            data
        };
    }
    async updateProposal({ signer, data }) {
        const author = await signer.getAddress();
        const message = {
            space: data.space,
            author,
            proposalId: data.proposal,
            executionStrategy: data.executionStrategy,
            metadataURI: data.metadataUri,
            salt: this.generateSalt()
        };
        const signatureData = await this.sign(signer, data.authenticator, message, types_1.updateProposalTypes);
        return {
            signatureData,
            data
        };
    }
    async vote({ signer, data }) {
        const voter = await signer.getAddress();
        const userVotingStrategies = await (0, evm_1.getStrategiesWithParams)('vote', data.strategies, voter, data, this.networkConfig);
        const message = {
            space: data.space,
            voter,
            proposalId: data.proposal,
            choice: data.choice,
            userVotingStrategies,
            voteMetadataURI: data.metadataUri
        };
        const signatureData = await this.sign(signer, data.authenticator, message, types_1.voteTypes);
        return {
            signatureData,
            data
        };
    }
}
exports.EthereumSig = EthereumSig;
