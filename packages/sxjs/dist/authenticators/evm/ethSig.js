"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EthSigAuthenticator_json_1 = __importDefault(require("./abis/EthSigAuthenticator.json"));
const encoding_1 = require("../../utils/encoding");
function createEthSigAuthenticator() {
    return {
        type: 'ethSig',
        createCall(envelope, selector, calldata) {
            const { signatureData, data } = envelope;
            const { space } = data;
            if (!signatureData)
                throw new Error('signatureData is required for this authenticator');
            const { r, s, v } = (0, encoding_1.getRSVFromSig)(signatureData.signature);
            const args = [
                v,
                (0, encoding_1.hexPadLeft)(r.toHex()),
                (0, encoding_1.hexPadLeft)(s.toHex()),
                signatureData.message.salt || '0x00',
                space,
                selector,
                ...calldata
            ];
            return {
                abi: EthSigAuthenticator_json_1.default,
                args
            };
        }
    };
}
exports.default = createEthSigAuthenticator;
