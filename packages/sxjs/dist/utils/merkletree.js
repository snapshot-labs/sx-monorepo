"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMerkleProof = exports.generateMerkleRoot = exports.Leaf = exports.AddressType = void 0;
const starknet_1 = require("starknet");
var AddressType;
(function (AddressType) {
    AddressType[AddressType["STARKNET"] = 0] = "STARKNET";
    AddressType[AddressType["ETHEREUM"] = 1] = "ETHEREUM";
    AddressType[AddressType["CUSTOM"] = 2] = "CUSTOM";
})(AddressType = exports.AddressType || (exports.AddressType = {}));
class Leaf {
    type;
    address;
    votingPower;
    constructor(type, address, votingPower) {
        this.type = type;
        this.address = address;
        this.votingPower = votingPower;
    }
    get hash() {
        const votingPowerUint256 = starknet_1.uint256.bnToUint256(this.votingPower);
        const values = [this.type, this.address, votingPowerUint256.low, votingPowerUint256.high];
        return starknet_1.hash.computeHashOnElements(values);
    }
}
exports.Leaf = Leaf;
function generateMerkleRoot(hashes) {
    if (hashes.length === 1) {
        return hashes[0];
    }
    if (hashes.length % 2 !== 0) {
        hashes = [...hashes, '0x0'];
    }
    const newHashes = [];
    for (let i = 0; i < hashes.length; i += 2) {
        let left;
        let right;
        if (BigInt(hashes[i]) > BigInt(hashes[i + 1])) {
            left = hashes[i];
            right = hashes[i + 1];
        }
        else {
            left = hashes[i + 1];
            right = hashes[i];
        }
        newHashes.push(starknet_1.ec.starkCurve.pedersen(left, right));
    }
    return generateMerkleRoot(newHashes);
}
exports.generateMerkleRoot = generateMerkleRoot;
function generateMerkleProof(hashes, index) {
    if (hashes.length === 1) {
        return [];
    }
    if (hashes.length % 2 !== 0) {
        hashes = [...hashes, '0x0'];
    }
    const newHashes = [];
    for (let i = 0; i < hashes.length; i += 2) {
        let left;
        let right;
        if (BigInt(hashes[i]) > BigInt(hashes[i + 1])) {
            left = hashes[i];
            right = hashes[i + 1];
        }
        else {
            left = hashes[i + 1];
            right = hashes[i];
        }
        newHashes.push(starknet_1.ec.starkCurve.pedersen(left, right));
    }
    const proof = generateMerkleProof(newHashes, Math.floor(index / 2));
    if (index % 2 === 0) {
        return [hashes[index + 1], ...proof];
    }
    else {
        return [hashes[index - 1], ...proof];
    }
}
exports.generateMerkleProof = generateMerkleProof;
