// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "../interfaces/IVotingStrategy.sol";

contract VanillaVotingStrategy is IVotingStrategy {
    function getVotingPower(uint32, address, bytes memory, bytes memory) external pure returns (uint256 votingPower) {
        return 1;
    }
}
