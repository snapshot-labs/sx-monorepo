"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EthTxAuthenticator_json_1 = __importDefault(require("./abis/EthTxAuthenticator.json"));
function createEthTxAuthenticator() {
    return {
        type: 'ethTx',
        createCall(envelope, selector, calldata) {
            const { space } = envelope.data;
            return {
                abi: EthTxAuthenticator_json_1.default,
                args: [space, selector, ...calldata]
            };
        }
    };
}
exports.default = createEthTxAuthenticator;
