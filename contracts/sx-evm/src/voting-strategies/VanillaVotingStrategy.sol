// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IVotingStrategy } from "../interfaces/IVotingStrategy.sol";

contract VanillaVotingStrategy is IVotingStrategy {
    function getVotingPower(
        uint32 /* timestamp */,
        address /* voter */,
        bytes calldata /* params */,
        bytes calldata /* userParams */
    ) external pure override returns (uint256) {
        return 1;
    }
}
