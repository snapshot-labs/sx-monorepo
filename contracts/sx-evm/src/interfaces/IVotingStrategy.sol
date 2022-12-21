// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

interface IVotingStrategy {
    function getVotingPower(
        uint256 timestamp,
        address voterAddress,
        bytes memory params,
        bytes memory userParams
    ) external view returns (uint256 votingPower);
}
