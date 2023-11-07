"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const VanillaAuthenticator_json_1 = __importDefault(require("./abis/VanillaAuthenticator.json"));
function createVanillaAuthenticator() {
    return {
        type: 'vanilla',
        createCall(envelope, selector, calldata) {
            const { space } = envelope.data;
            return {
                abi: VanillaAuthenticator_json_1.default,
                args: [space, selector, ...calldata]
            };
        }
    };
}
exports.default = createVanillaAuthenticator;
