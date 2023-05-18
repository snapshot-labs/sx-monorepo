// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Test } from "forge-std/Test.sol";
import { WhitelistVotingStrategy } from "../src/voting-strategies/WhitelistVotingStrategy.sol";

contract WhitelistVotingStrategyTest is Test {
    WhitelistVotingStrategy public whitelistVotingStrategy;

    function testWhitelistVotingPower() public {
        WhitelistVotingStrategy.Member[] memory members = new WhitelistVotingStrategy.Member[](3);
        members[0] = WhitelistVotingStrategy.Member(address(1), 11);
        members[1] = WhitelistVotingStrategy.Member(address(3), 33);
        members[2] = WhitelistVotingStrategy.Member(address(5), 55);
        whitelistVotingStrategy = new WhitelistVotingStrategy();

        bytes memory params = abi.encode(members);

        assertEq(whitelistVotingStrategy.getVotingPower(0, members[0].addr, params, ""), members[0].vp);
        assertEq(whitelistVotingStrategy.getVotingPower(0, members[1].addr, params, ""), members[1].vp);
        assertEq(whitelistVotingStrategy.getVotingPower(0, members[2].addr, params, ""), members[2].vp);

        // Index 0
        assertEq(whitelistVotingStrategy.getVotingPower(0, address(0), params, ""), 0);
        // Index 2
        assertEq(whitelistVotingStrategy.getVotingPower(0, address(2), params, ""), 0);
        // 4
        assertEq(whitelistVotingStrategy.getVotingPower(0, address(4), params, ""), 0);
        // Last index
        assertEq(whitelistVotingStrategy.getVotingPower(0, address(6), params, ""), 0);
    }

    function testWhitelistVotingPowerSmall() public {
        WhitelistVotingStrategy.Member[] memory members = new WhitelistVotingStrategy.Member[](3);
        members[0] = WhitelistVotingStrategy.Member(address(1), 11);
        members[1] = WhitelistVotingStrategy.Member(address(3), 33);
        whitelistVotingStrategy = new WhitelistVotingStrategy();

        bytes memory params = abi.encode(members);

        assertEq(whitelistVotingStrategy.getVotingPower(0, members[0].addr, params, ""), members[0].vp);
        assertEq(whitelistVotingStrategy.getVotingPower(0, members[1].addr, params, ""), members[1].vp);

        // Index 0
        assertEq(whitelistVotingStrategy.getVotingPower(0, address(0), params, ""), 0);
        // Index 2
        assertEq(whitelistVotingStrategy.getVotingPower(0, address(2), params, ""), 0);
        // Last index
        assertEq(whitelistVotingStrategy.getVotingPower(0, address(4), params, ""), 0);
    }
}
