// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IProposalValidationStrategy } from "../interfaces/IProposalValidationStrategy.sol";
import { ActiveProposalsLimiter } from "./utils/ActiveProposalsLimiter.sol";

/// @title Active Proposals Limiter Proposal Validation Strategy
/// @notice Strategy to limit proposal creation to a maximum number of active proposals per author.
contract ActiveProposalsLimiterProposalValidationStrategy is ActiveProposalsLimiter, IProposalValidationStrategy {
    /// @notice Validates an author by checking if they have reached the maximum number of active proposals at the
    ///         current timestamp.
    /// @param author Author of the proposal.
    /// @param params ABI encoded array that should contain the following:
    ///                 cooldown: Duration to wait before the proposal counter gets reset.
    ///                 maxActiveProposals: Maximum number of active proposals per author. Must be != 0.
    /// @return success Whether the proposal was validated.
    function validate(
        address author,
        bytes calldata params,
        bytes calldata /* userParams*/
    ) external override returns (bool success) {
        (uint256 cooldown, uint256 maxActiveProposals) = abi.decode(params, (uint256, uint256));
        return _validate(author, cooldown, maxActiveProposals);
    }
}
