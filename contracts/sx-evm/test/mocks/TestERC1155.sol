// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract TestERC1155 is ERC1155 {
    // solhint-disable-next-line no-empty-blocks
    constructor() ERC1155("") {}

    function mint(address account, uint256 id, uint256 amount) public {
        _mint(account, id, amount, "");
    }
}
