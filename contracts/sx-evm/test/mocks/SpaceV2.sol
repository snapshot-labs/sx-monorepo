// SPDX-License-Identifier: UNLICENSED

import { Space } from "../../src/Space.sol";

pragma solidity ^0.8.18;

// Inheriting from the Space contract V1 ensures that there are no storage collisions.
contract SpaceV2 is Space {
    uint256 internal magicNumber;

    function setMagicNumber(uint256 newMagicNumber) public {
        magicNumber = newMagicNumber;
    }

    function getMagicNumber() public view returns (uint256) {
        return magicNumber;
    }
}
