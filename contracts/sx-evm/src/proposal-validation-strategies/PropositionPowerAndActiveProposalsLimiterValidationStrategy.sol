// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IProposalValidationStrategy } from "../interfaces/IProposalValidationStrategy.sol";
import { IndexedStrategy, Strategy } from "../types.sol";
import { ActiveProposalsLimiter } from "./utils/ActiveProposalsLimiter.sol";
import { PropositionPower } from "./utils/PropositionPower.sol";

/// @title Proposition Power and Active Proposals Limiter Proposal Validation Strategy
/// @notice Strategy that limits proposal creation to authors that exceed a threshold proposition
///         power over a set of voting strategies, and a maximum number of active proposals.
contract PropositionPowerAndActiveProposalsLimiterValidationStrategy is
    ActiveProposalsLimiter,
    PropositionPower,
    IProposalValidationStrategy
{
    /// @notice Validates an author by checking if the proposition power of the author exceeds a threshold over a set of
    ///         strategies and if the author has reached the maximum number of active proposals at the current timestamp.
    /// @param author Author of the proposal.
    /// @param params ABI encoded array that should contain the following:
    ///                 cooldown: Duration to wait before the proposal counter gets reset.
    ///                 maxActiveProposals: Maximum number of active proposals per author. Must be != 0.
    ///                 proposalThreshold: Minimum proposition power required to create a proposal.
    ///                 allowedStrategies: Array of allowed voting strategies.
    /// @param userParams ABI encoded array that should contain the user voting strategies.
    function validate(address author, bytes calldata params, bytes calldata userParams) external returns (bool) {
        (
            uint256 cooldown,
            uint256 maxActiveProposals,
            uint256 proposalThreshold,
            Strategy[] memory allowedStrategies
        ) = abi.decode(params, (uint256, uint256, uint256, Strategy[]));
        IndexedStrategy[] memory userStrategies = abi.decode(userParams, (IndexedStrategy[]));

        return
            ActiveProposalsLimiter._validate(author, cooldown, maxActiveProposals) &&
            PropositionPower._validate(author, proposalThreshold, allowedStrategies, userStrategies);
    }
}
