"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthenticator = void 0;
const vanilla_1 = __importDefault(require("./vanilla"));
const ethTx_1 = __importDefault(require("./ethTx"));
const ethSig_1 = __importDefault(require("./ethSig"));
function getAuthenticator(address, networkConfig) {
    const authenticator = networkConfig.authenticators[address];
    if (!authenticator)
        return null;
    if (authenticator.type === 'vanilla') {
        return (0, vanilla_1.default)();
    }
    if (authenticator.type === 'ethTx') {
        return (0, ethTx_1.default)();
    }
    if (authenticator.type === 'ethSig') {
        return (0, ethSig_1.default)();
    }
    return null;
}
exports.getAuthenticator = getAuthenticator;
