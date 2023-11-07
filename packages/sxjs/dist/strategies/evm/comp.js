"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("@ethersproject/contracts");
const IComp_json_1 = __importDefault(require("./abis/IComp.json"));
function createCompStrategy() {
    return {
        type: 'comp',
        async getParams() {
            return '0x00';
        },
        async getVotingPower(strategyAddress, voterAddress, metadata, block, params, provider) {
            const compContract = new contracts_1.Contract(params, IComp_json_1.default, provider);
            const votingPower = await compContract.getCurrentVotes(voterAddress, { blockTag: block });
            return BigInt(votingPower.toString());
        }
    };
}
exports.default = createCompStrategy;
