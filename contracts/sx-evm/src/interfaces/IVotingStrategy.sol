// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/// @title Voting Strategy Interface
interface IVotingStrategy {
    /// @notice Gets the voting power of an address at a given timestamp.
    /// @param timestamp The snapshot timestamp to get the voting power at. If a particular voting strategy
    ///                  requires a block number instead of a timestamp, the strategy should resolve the
    ///                  timestamp to a block number.
    /// @param voter The address to get the voting power of.
    /// @param params The global parameters that can configure the voting strategy for a particular Space.
    /// @param userParams The user parameters that can be used in the voting strategy computation.
    /// @return votingPower The voting power of the address at the given timestamp. If there is no voting power,
    ///                     return 0.
    function getVotingPower(
        uint32 timestamp,
        address voter,
        bytes calldata params,
        bytes calldata userParams
    ) external returns (uint256 votingPower);
}
