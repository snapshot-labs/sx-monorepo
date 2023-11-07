"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthenticator = void 0;
const vanilla_1 = __importDefault(require("./vanilla"));
const ethSig_1 = __importDefault(require("./ethSig"));
const ethTx_1 = __importDefault(require("./ethTx"));
const starkSig_1 = __importDefault(require("./starkSig"));
const starkTx_1 = __importDefault(require("./starkTx"));
const encoding_1 = require("../../utils/encoding");
function getAuthenticator(address, networkConfig) {
    const authenticator = networkConfig.authenticators[(0, encoding_1.hexPadLeft)(address)];
    if (!authenticator)
        return null;
    if (authenticator.type === 'vanilla') {
        return (0, vanilla_1.default)();
    }
    if (authenticator.type === 'ethSig') {
        return (0, ethSig_1.default)();
    }
    if (authenticator.type === 'ethTx') {
        return (0, ethTx_1.default)();
    }
    if (authenticator.type === 'starkSig') {
        return (0, starkSig_1.default)();
    }
    if (authenticator.type === 'starkTx') {
        return (0, starkTx_1.default)();
    }
    return null;
}
exports.getAuthenticator = getAuthenticator;
