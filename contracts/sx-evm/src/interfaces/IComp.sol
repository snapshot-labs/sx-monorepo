// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

interface IComp {
    function getPriorVotes(address account, uint256 blockNumber) external view returns (uint96);
}
