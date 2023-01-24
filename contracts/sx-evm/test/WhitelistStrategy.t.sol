// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "../src/voting-strategies/WhitelistStrategy.sol";

contract WhitelistStrategyTest is Test {
    WhitelistStrategy public whitelistStrategy;

    function testWhitelistVotingPower() public {
        WhitelistStrategy.Member[] memory members = new WhitelistStrategy.Member[](3);
        members[0] = WhitelistStrategy.Member(address(1), 11);
        members[1] = WhitelistStrategy.Member(address(3), 33);
        members[2] = WhitelistStrategy.Member(address(5), 55);
        whitelistStrategy = new WhitelistStrategy();

        bytes memory params = abi.encode(members);

        assertEq(whitelistStrategy.getVotingPower(0, members[0].addy, params, ""), members[0].vp);
        assertEq(whitelistStrategy.getVotingPower(0, members[1].addy, params, ""), members[1].vp);
        assertEq(whitelistStrategy.getVotingPower(0, members[2].addy, params, ""), members[2].vp);

        // Index 0
        assertEq(whitelistStrategy.getVotingPower(0, address(0), params, ""), 0);
        // Index 2
        assertEq(whitelistStrategy.getVotingPower(0, address(2), params, ""), 0);
        // 4
        assertEq(whitelistStrategy.getVotingPower(0, address(4), params, ""), 0);
        // Last index
        assertEq(whitelistStrategy.getVotingPower(0, address(6), params, ""), 0);
    }

    function testWhitelistVotingPowerSmall() public {
        WhitelistStrategy.Member[] memory members = new WhitelistStrategy.Member[](3);
        members[0] = WhitelistStrategy.Member(address(1), 11);
        members[1] = WhitelistStrategy.Member(address(3), 33);
        whitelistStrategy = new WhitelistStrategy();

        bytes memory params = abi.encode(members);

        assertEq(whitelistStrategy.getVotingPower(0, members[0].addy, params, ""), members[0].vp);
        assertEq(whitelistStrategy.getVotingPower(0, members[1].addy, params, ""), members[1].vp);

        // Index 0
        assertEq(whitelistStrategy.getVotingPower(0, address(0), params, ""), 0);
        // Index 2
        assertEq(whitelistStrategy.getVotingPower(0, address(2), params, ""), 0);
        // Last index
        assertEq(whitelistStrategy.getVotingPower(0, address(4), params, ""), 0);
    }
}
