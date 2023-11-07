"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const starknet_1 = require("starknet");
const ERC20VotesToken_json_1 = __importDefault(require("./abis/ERC20VotesToken.json"));
function createErc20VotesStrategy() {
    return {
        type: 'erc20Votes',
        async getParams(call, signerAddress, address, index, metadata, envelope, clientConfig) {
            const isEthereumAddress = signerAddress.length === 42;
            if (isEthereumAddress)
                throw new Error('Not supported for Ethereum addresses');
            return [];
        },
        async getExtraProposeCalls(address, index, envelope, clientConfig) {
            return [];
        },
        async getVotingPower(strategyAddress, voterAddress, metadata, timestamp, params, clientConfig) {
            const isEthereumAddress = voterAddress.length === 42;
            if (isEthereumAddress)
                return 0n;
            const contract = new starknet_1.Contract(ERC20VotesToken_json_1.default, params[0], clientConfig.starkProvider);
            if (timestamp) {
                return contract.get_past_votes(voterAddress, timestamp);
            }
            return contract.get_votes(voterAddress);
        }
    };
}
exports.default = createErc20VotesStrategy;
