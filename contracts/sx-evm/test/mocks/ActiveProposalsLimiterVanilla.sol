// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IProposalValidationStrategy } from "../../src/interfaces/IProposalValidationStrategy.sol";
import { ActiveProposalsLimiter } from "../../src/proposal-validation-strategies/ActiveProposalsLimiter.sol";

// Always returns false
contract ActiveProposalsLimiterVanilla is IProposalValidationStrategy, ActiveProposalsLimiter {
    // solhint-disable-next-line no-empty-blocks
    constructor(uint32 _cooldown, uint224 _maxActiveProposals) ActiveProposalsLimiter(_cooldown, _maxActiveProposals) {}

    function validate(
        address author,
        bytes calldata, // params,
        bytes calldata // userParams
    ) external override returns (bool) {
        return increaseActiveProposalCount(author);
    }
}
