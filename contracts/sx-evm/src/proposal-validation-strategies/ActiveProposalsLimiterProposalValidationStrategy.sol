// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IProposalValidationStrategy } from "../interfaces/IProposalValidationStrategy.sol";
import { ActiveProposalsLimiter } from "./utils/ActiveProposalsLimiter.sol";

/// @title Active Proposals Limiter Proposal Validation Strategy
/// @notice Strategy to limit proposal creation to a maximum number of active proposals per author.
contract ActiveProposalsLimiterProposalValidationStrategy is ActiveProposalsLimiter, IProposalValidationStrategy {
    // solhint-disable-next-line no-empty-blocks
    constructor(uint32 _cooldown, uint224 _maxActiveProposals) ActiveProposalsLimiter(_cooldown, _maxActiveProposals) {}

    /// @notice Validates an author by checking if they have reached the maximum number of active proposals at the
    ///         current timestamp.
    /// @param author Author of the proposal.
    /// @return success Whether the proposal was validated.
    function validate(
        address author,
        bytes calldata /* params */,
        bytes calldata /* userParams*/
    ) external override returns (bool success) {
        return _validate(author);
    }
}
