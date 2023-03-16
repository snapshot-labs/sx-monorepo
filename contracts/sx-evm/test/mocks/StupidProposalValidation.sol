// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IProposalValidationStrategy } from "../../src/interfaces/IProposalValidationStrategy.sol";
import { Strategy } from "../../src/types.sol";

// Always returns false
contract StupidProposalValidationStrategy is IProposalValidationStrategy {
    function validate(
        address, // author,
        bytes calldata, // params,
        bytes calldata // userParams
    ) external override returns (bool) {
        return false;
    }
}
