// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Test } from "forge-std/Test.sol";
import { WhitelistVotingStrategy } from "../src/voting-strategies/WhitelistVotingStrategy.sol";

contract WhitelistVotingStrategyTest is Test {
    error VoterAndIndexMismatch();

    WhitelistVotingStrategy public whitelistVotingStrategy;

    function testWhitelistVotingPower() public {
        WhitelistVotingStrategy.Member[] memory members = new WhitelistVotingStrategy.Member[](3);
        members[0] = WhitelistVotingStrategy.Member(address(3), 33);
        members[1] = WhitelistVotingStrategy.Member(address(1), 11);
        members[2] = WhitelistVotingStrategy.Member(address(5), 55);
        whitelistVotingStrategy = new WhitelistVotingStrategy();

        bytes memory params = abi.encode(members);

        assertEq(whitelistVotingStrategy.getVotingPower(0, members[0].addr, params, abi.encode(0)), members[0].vp);
        assertEq(whitelistVotingStrategy.getVotingPower(0, members[1].addr, params, abi.encode(1)), members[1].vp);
        assertEq(whitelistVotingStrategy.getVotingPower(0, members[2].addr, params, abi.encode(2)), members[2].vp);
    }

    function testWhitelistVoterAndIndexMismatch() public {
        WhitelistVotingStrategy.Member[] memory members = new WhitelistVotingStrategy.Member[](3);
        members[0] = WhitelistVotingStrategy.Member(address(1), 11);
        members[1] = WhitelistVotingStrategy.Member(address(3), 33);
        whitelistVotingStrategy = new WhitelistVotingStrategy();

        bytes memory params = abi.encode(members);

        vm.expectRevert(VoterAndIndexMismatch.selector);
        // `voter` is members[0] but the `voterIndex` is 1 (which corresponds to members[1]).
        whitelistVotingStrategy.getVotingPower(0, members[0].addr, params, abi.encode(1));
    }

    function testWhitelistIndexOutOfBounds() public {
        WhitelistVotingStrategy.Member[] memory members = new WhitelistVotingStrategy.Member[](3);
        members[0] = WhitelistVotingStrategy.Member(address(1), 11);
        members[1] = WhitelistVotingStrategy.Member(address(3), 33);
        whitelistVotingStrategy = new WhitelistVotingStrategy();

        bytes memory params = abi.encode(members);

        vm.expectRevert(); // Out of bounds revert
        // `voter` is members[0] but the `voterIndex` is 3 (which is out of bounds).
        whitelistVotingStrategy.getVotingPower(0, members[0].addr, params, abi.encode(3));
    }
}
