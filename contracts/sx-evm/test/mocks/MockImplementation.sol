// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/// @notice Simple implementation to test delegatecall
contract MockImplementation {
    function transferEth(address payable to, uint256 amount) external {
        to.transfer(amount);
    }
}
