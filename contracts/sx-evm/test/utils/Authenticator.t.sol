// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Test } from "forge-std/Test.sol";

contract DemoTarget {
    uint256 public x;
    error TooBig();

    function foo(uint256 _x) public {
        if (_x > 10) revert TooBig();
        x = _x;
    }
}

abstract contract AuthenticatorTest is Test {
    error TooBig();

    DemoTarget public target;

    function setUp() public virtual {
        target = new DemoTarget();
    }
}
