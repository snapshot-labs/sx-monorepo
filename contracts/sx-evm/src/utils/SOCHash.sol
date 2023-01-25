// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "src/types.sol";

/// @title SOC Types Hashing Library
/// @notice This library contains functions for hashing SOC types for use in eip712 signatures.
/// TODO: rename once we have a better name for SOC
library SOCHash {
    bytes32 private constant STRATEGY_TYPEHASH = keccak256("Strategy(address addy,bytes params)");
    bytes32 private constant INDEXED_STRATEGY_TYPEHASH = keccak256("IndexedStrategy(uint8 index,bytes params)");
    bytes32 private constant PROPOSE_TYPEHASH =
        keccak256(
            "Propose(address space,address author,string metadataUri,Strategy executionStrategy,"
            "IndexedStrategy[] userVotingStrategies,uint256 salt)"
        );

    function hash(Strategy memory strategy) internal pure returns (bytes32) {
        return keccak256(abi.encode(STRATEGY_TYPEHASH, strategy));
    }

    function hash(IndexedStrategy[] memory indexedStrategies) internal pure returns (bytes32) {
        bytes32[] memory indexedStrategyHashes = new bytes32[](indexedStrategies.length);
        for (uint256 i = 0; i < indexedStrategies.length; i++) {
            indexedStrategyHashes[i] = keccak256(abi.encode(INDEXED_STRATEGY_TYPEHASH, indexedStrategies[i]));
        }
        return keccak256(abi.encodePacked(indexedStrategyHashes));
    }
}
