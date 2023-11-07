"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createVanillaExecutor() {
    return {
        type: 'vanilla',
        getExecutionData(executorAddress) {
            return {
                executor: executorAddress,
                executionParams: []
            };
        }
    };
}
exports.default = createVanillaExecutor;
