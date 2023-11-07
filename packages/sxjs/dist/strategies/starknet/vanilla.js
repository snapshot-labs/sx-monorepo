"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars */
Object.defineProperty(exports, "__esModule", { value: true });
function createVanillaStrategy() {
    return {
        type: 'vanilla',
        async getParams(call, signerAddress, address, index, metadata, envelope, clientConfig) {
            return ['0x0'];
        },
        async getExtraProposeCalls(address, index, envelope, clientConfig) {
            return [];
        },
        async getVotingPower() {
            return 1n;
        }
    };
}
exports.default = createVanillaStrategy;
