"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("@ethersproject/contracts");
const IVotes_json_1 = __importDefault(require("./abis/IVotes.json"));
function createOzVotesStrategy() {
    return {
        type: 'ozVotes',
        async getParams() {
            return '0x00';
        },
        async getVotingPower(strategyAddress, voterAddress, metadata, block, params, provider) {
            const votesContract = new contracts_1.Contract(params, IVotes_json_1.default, provider);
            const votingPower = await votesContract.getVotes(voterAddress, { blockTag: block });
            return BigInt(votingPower.toString());
        }
    };
}
exports.default = createOzVotesStrategy;
