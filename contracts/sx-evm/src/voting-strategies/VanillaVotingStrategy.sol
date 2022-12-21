// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "../interfaces/IVotingStrategy.sol";

contract VanillaVotingStrategy is IVotingStrategy {
    // solhint-disable no-unused-vars
    function getVotingPower(
        uint256 timestamp,
        address voterAddress,
        bytes memory params,
        bytes memory userParams
    ) external view returns (uint256 votingPower) {
        return 1;
    }
}
