// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestERC721 is ERC721 {
    // solhint-disable-next-line no-empty-blocks
    constructor() ERC721("TEST_ERC721", "TEST_ERC721") {}

    function mint(address account, uint256 id) public {
        _mint(account, id);
    }
}
