// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

/**
 * @author  Snapshot Labs
 * @title   Active Proposals Limiter
 * @notice  Exposes a function `increaseActiveProposalCount` that will error if
 *          user has reached `maxActiveProposals` without waiting for `cooldown` to pass.
 *          The counter gets reset everytime `cooldown` has passed.
 */

abstract contract ActiveProposalsLimiter {
    error MaxActiveProposalsCannotBeZero();

    // cooldown to wait before the counter gets reset
    uint32 public immutable cooldown;

    // Maximum number of active proposals per user. Must be != 0
    uint224 public immutable maxActiveProposals;

    // Mapping that stores data for each user. Data is as follows:
    //   [0..32] : 32 bits for the timestamp of the latest proposal made by the user
    //   [32..256] : 224 bits for the number of currently active proposals for this user
    mapping(address => uint256) public usersPackedData;

    constructor(uint32 _cooldown, uint224 _maxActiveProposals) {
        if (_maxActiveProposals == 0) revert MaxActiveProposalsCannotBeZero();

        cooldown = _cooldown;
        maxActiveProposals = _maxActiveProposals;
    }

    function increaseActiveProposalCount(address user) internal returns (bool success) {
        // See comments of `usersPackedData`
        uint256 packedData = usersPackedData[user];

        // Effectively a uint32 (32 last bits of packedData)
        uint256 lastTimestamp = uint32(packedData);

        // 256 - 32 == 224 bits
        uint256 activeProposals = packedData >> 32;

        if (lastTimestamp == 0) {
            // First time the user proposes, activeProposals is 1 no matter what
            activeProposals = 1;
        } else if (block.timestamp >= lastTimestamp + cooldown) {
            // cooldown passed, reset counter
            activeProposals = 1;
        } else if (activeProposals == maxActiveProposals) {
            // cooldown has not passed, but user has reached maximum active proposals. Error.
            return false;
        } else {
            // cooldown has not passed, user has not reached maximum active proposals: increase counter.
            activeProposals += 1;
        }

        // Update storage
        usersPackedData[user] = (activeProposals << 32) + uint32(block.timestamp);
        return true;
    }
}
