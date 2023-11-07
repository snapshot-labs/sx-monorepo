"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStarknetStrategy = exports.getEvmStrategy = void 0;
var evm_1 = require("./evm");
Object.defineProperty(exports, "getEvmStrategy", { enumerable: true, get: function () { return evm_1.getStrategy; } });
var starknet_1 = require("./starknet");
Object.defineProperty(exports, "getStarknetStrategy", { enumerable: true, get: function () { return starknet_1.getStrategy; } });
