// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "forge-std/Test.sol";
import "../src/voting-strategies/CompVotingStrategy.sol";
import "./mocks/CompToken.sol";

contract TimestampResolverTest is Test {
    error TimestampInFuture();
    error InvalidBlockNumber();
    error InvalidBytesArray();

    CompVotingStrategy public compVotingStrategy;
    CompToken public compToken;

    address public user = address(this);
    address public user2 = address(1);

    function setUp() public {
        compVotingStrategy = new CompVotingStrategy();
        compToken = new CompToken();
    }

    function testTimestampResolver() public {
        compToken.mint(user, 1);
        compToken.delegate(user);
        vm.roll(block.number + 1);

        assertEq(
            compVotingStrategy.getVotingPower(uint32(block.timestamp), user, abi.encodePacked(address(compToken)), ""),
            1
        ); // sanity check

        // The snapshot timestamp is resolved to the current block number - 1
        assertEq(compVotingStrategy.timestampToBlockNumber(uint32(block.timestamp)), block.number - 1);

        // // Increasing the timestamp
        vm.warp(block.timestamp + 100);

        compToken.mint(user2, 1);
        vm.prank(user2);
        compToken.delegate(user2);
        vm.roll(block.number + 1);

        // assertEq(compVotingStrategy.timestampToBlockNumber(snapshotTimestamp), snapshotBlockNumber);

        // user2 has no voting power at the snapshot timestamp because the delegation happened after
        assertEq(
            compVotingStrategy.getVotingPower(
                uint32(block.timestamp - 100),
                user2,
                abi.encodePacked(address(compToken)),
                ""
            ),
            0
        );

        // However at the current timestamp, the delegation is active
        assertEq(
            compVotingStrategy.getVotingPower(uint32(block.timestamp), user2, abi.encodePacked(address(compToken)), ""),
            1
        );
    }

    function testTimestampResolverInvalidTimestamp() public {
        compToken.mint(user, 1);
        compToken.delegate(user);
        vm.roll(block.number + 1);
        vm.expectRevert(TimestampInFuture.selector);
        // Timestamp is set to the future
        compVotingStrategy.getVotingPower(uint32(block.timestamp + 1), user, abi.encodePacked(address(compToken)), "");
    }

    function testTimestampResolverInvalidBlockNumber() public {
        vm.expectRevert(InvalidBlockNumber.selector);
        // Current block number is 1, which is invalid
        compVotingStrategy.getVotingPower(uint32(block.timestamp), user, abi.encodePacked(address(compToken)), "0");
    }
}
