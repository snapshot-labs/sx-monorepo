// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { ERC20Votes, ERC20, ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract ERC20VotesToken is ERC20Votes {
    constructor(string memory tokenName, string memory symbol) ERC20Permit(tokenName) ERC20(tokenName, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}
