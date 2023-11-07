"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createVanillaStrategy() {
    return {
        type: 'vanilla',
        async getParams() {
            return '0x00';
        },
        async getVotingPower() {
            return 1n;
        }
    };
}
exports.default = createVanillaStrategy;
