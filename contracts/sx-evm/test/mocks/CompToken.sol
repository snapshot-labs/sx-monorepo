// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { ERC20, ERC20Permit, ERC20VotesComp } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20VotesComp.sol";

contract CompToken is ERC20VotesComp {
    constructor() ERC20("Test", "TEST") ERC20Permit("Test") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
