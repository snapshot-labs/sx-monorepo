// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "forge-std/Test.sol";
import "../src/voting-strategies/OZVotesVotingStrategy.sol";
import "./mocks/ERC20VotesToken.sol";

contract OZVotesVotingStrategyTest is Test {
    error InvalidByteArray();

    OZVotesVotingStrategy public ozVotesVotingStrategy;
    ERC20VotesToken public erc20VotesToken;

    address public user = address(this);
    address public user2 = address(1);

    function setUp() public {
        ozVotesVotingStrategy = new OZVotesVotingStrategy();
        erc20VotesToken = new ERC20VotesToken("VOTES", "VOTES");
    }

    function testGetVotingPower() public {
        erc20VotesToken.mint(user, 1);
        // Must delegate to self to activate checkpoints
        erc20VotesToken.delegate(user);
        vm.roll(block.number + 1);
        assertEq(
            ozVotesVotingStrategy.getVotingPower(
                uint32(block.timestamp),
                user,
                abi.encodePacked(address(erc20VotesToken)),
                ""
            ),
            1
        );
    }

    function testGetZeroVotingPower() public {
        erc20VotesToken.mint(user, 1);
        // No delegation, so voting power is zero
        vm.roll(block.number + 1);
        assertEq(
            ozVotesVotingStrategy.getVotingPower(
                uint32(block.timestamp),
                user,
                abi.encodePacked(address(erc20VotesToken)),
                ""
            ),
            0
        );
    }

    function testGetVotingPowerInvalidToken() public {
        erc20VotesToken.mint(user, 1);
        erc20VotesToken.delegate(user);
        vm.roll(block.number + 1);
        vm.expectRevert();
        // Token address is set to zero
        ozVotesVotingStrategy.getVotingPower(uint32(block.timestamp), user, abi.encodePacked(address(0)), "");
    }

    function testGetVotingPowerInvalidParamsArray() public {
        erc20VotesToken.mint(user, 1);
        erc20VotesToken.delegate(user);
        vm.roll(block.number + 1);
        vm.expectRevert(InvalidByteArray.selector);
        // Params array is too short
        ozVotesVotingStrategy.getVotingPower(uint32(block.timestamp), user, abi.encodePacked("1234"), "");
    }
}
