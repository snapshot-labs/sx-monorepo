// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "../src/voting-strategies/CompVotingStrategy.sol";
import "./mocks/CompToken.sol";

contract CompVotingStrategyTest is Test {
    error InvalidByteArray();

    CompVotingStrategy public compVotingStrategy;
    CompToken public compToken;

    address public user = address(this);
    address public user2 = address(1);

    function setUp() public {
        compVotingStrategy = new CompVotingStrategy();
        compToken = new CompToken();
    }

    function testGetVotingPower() public {
        compToken.mint(user, 1);
        // Must delegate to self to activate checkpoints
        compToken.delegate(user);
        vm.roll(block.number + 1);
        assertEq(
            compVotingStrategy.getVotingPower(uint32(block.timestamp), user, abi.encodePacked(address(compToken)), ""),
            1
        );
    }

    function testGetZeroVotingPower() public {
        compToken.mint(user, 1);
        // No delegation, so voting power is zero
        vm.roll(block.number + 1);
        assertEq(
            compVotingStrategy.getVotingPower(uint32(block.timestamp), user, abi.encodePacked(address(compToken)), ""),
            0
        );
    }

    function testGetVotingPowerInvalidToken() public {
        compToken.mint(user, 1);
        compToken.delegate(user);
        vm.roll(block.number + 1);
        vm.expectRevert();
        // Token address is set to zero
        compVotingStrategy.getVotingPower(uint32(block.timestamp), user, abi.encodePacked(address(0)), "");
    }

    function testGetVotingPowerInvalidParamsArray() public {
        compToken.mint(user, 1);
        compToken.delegate(user);
        vm.roll(block.number + 1);
        vm.expectRevert(InvalidByteArray.selector);
        // Params array is too short
        compVotingStrategy.getVotingPower(uint32(block.timestamp), user, abi.encodePacked("1234"), "");
    }
}
