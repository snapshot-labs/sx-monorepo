"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.L1Executor = void 0;
const contracts_1 = require("@ethersproject/contracts");
const L1AvatarExecutionStrategy_json_1 = __importDefault(require("./abis/L1AvatarExecutionStrategy.json"));
class L1Executor {
    async deploy({ signer, params: { owner, target, starknetCore, executionRelayer, starknetSpaces, quorum } }) {
        const factory = new contracts_1.ContractFactory(L1AvatarExecutionStrategy_json_1.default.abi, L1AvatarExecutionStrategy_json_1.default.bytecode.object, signer);
        const deploy = await factory.deploy(owner, target, starknetCore, executionRelayer, starknetSpaces, quorum);
        return {
            address: deploy.address,
            txId: deploy.deployTransaction.hash
        };
    }
    async execute({ signer, executor, space, proposal, votesFor, votesAgainst, votesAbstain, executionHash, transactions }) {
        const contract = new contracts_1.Contract(executor, L1AvatarExecutionStrategy_json_1.default.abi, signer);
        return contract.execute(space, proposal, votesFor, votesAgainst, votesAbstain, executionHash, transactions);
    }
}
exports.L1Executor = L1Executor;
