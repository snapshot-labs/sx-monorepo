// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

abstract contract TimestampResolver {
    error TimestampInFuture();
    error InvalidBlockNumber();

    mapping(uint32 => uint256) public timestampToBlockNumber;

    /// @notice Resolves a timestamp to a block number in such a way that the same timestamp
    /// always resolves to the same block number. If the timestamp is in the future, reverts.
    /// @param timestamp The timestamp to resolve
    /// @return blockNumber The block number that the timestamp resolves to
    function resolveSnapshotTimestamp(uint32 timestamp) internal returns (uint256 blockNumber) {
        if (timestamp > uint32(block.timestamp)) revert TimestampInFuture();
        if (block.number == 1) revert InvalidBlockNumber();

        blockNumber = timestampToBlockNumber[timestamp];
        if (blockNumber != 0) {
            // Timestamp already resolved, return the previously resolved block number
            return blockNumber;
        }
        // Timestamp not yet resolved, resolve it to the current block number - 1 and return it
        // We resolve to the current block number - 1 so that Comp style getPastVotes/getPriorVotes
        // functions can be used in same block as when the resolution is made
        blockNumber = block.number - 1;

        timestampToBlockNumber[timestamp] = blockNumber;
        return blockNumber;
    }
}
