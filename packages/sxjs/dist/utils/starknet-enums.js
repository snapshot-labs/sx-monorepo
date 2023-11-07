"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserAddressEnum = exports.getChoiceEnum = void 0;
const starknet_1 = require("starknet");
function getChoiceEnum(choice) {
    return new starknet_1.CairoCustomEnum({
        Against: choice === 0 ? 0 : undefined,
        For: choice === 1 ? 1 : undefined,
        Abstain: choice === 2 ? 2 : undefined
    });
}
exports.getChoiceEnum = getChoiceEnum;
function getUserAddressEnum(type, address) {
    return new starknet_1.CairoCustomEnum({
        Ethereum: type === 'ETHEREUM' ? address : undefined,
        Starknet: type === 'STARKNET' ? address : undefined,
        Custom: type === 'CUSTOM' ? address : undefined
    });
}
exports.getUserAddressEnum = getUserAddressEnum;
