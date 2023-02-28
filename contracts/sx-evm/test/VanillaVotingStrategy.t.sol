// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "forge-std/Test.sol";
import "../src/voting-strategies/VanillaVotingStrategy.sol";

contract VanillaVotingStrategyTest is Test {
    VanillaVotingStrategy public vanillaVotingStrategy;

    function setUp() public {
        vanillaVotingStrategy = new VanillaVotingStrategy();
    }

    function testGetVotingPower() public {
        // The voting power should always be 1.
        assertEq(vanillaVotingStrategy.getVotingPower(0, address(0), "", ""), 1);
    }
}
