// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";

contract SpaceStateTest is SpaceTest {
    function testGetInvalidProposal() public {
        vm.expectRevert(abi.encodeWithSelector(InvalidProposal.selector));
        // No proposal has been created yet
        space.getProposal(1);
    }
}
