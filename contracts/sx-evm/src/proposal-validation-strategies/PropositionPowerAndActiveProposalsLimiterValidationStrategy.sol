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
    // solhint-disable-next-line no-empty-blocks
    constructor(uint32 _cooldown, uint224 _maxActiveProposals) ActiveProposalsLimiter(_cooldown, _maxActiveProposals) {}

    /// @notice Validates an author by checking if the proposition power of the author exceeds a threshold over a set of
    ///         strategies and if the author has reached the maximum number of active proposals at the current timestamp.
    function validate(address author, bytes calldata params, bytes calldata userParams) external returns (bool) {
        (uint256 proposalThreshold, Strategy[] memory allowedStrategies) = abi.decode(params, (uint256, Strategy[]));
        IndexedStrategy[] memory userStrategies = abi.decode(userParams, (IndexedStrategy[]));

        return
            ActiveProposalsLimiter._validate(author) &&
            PropositionPower._validate(author, proposalThreshold, allowedStrategies, userStrategies);
    }
}
