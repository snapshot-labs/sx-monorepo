// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IProposalValidationStrategy } from "../interfaces/IProposalValidationStrategy.sol";
import { IndexedStrategy, Strategy } from "../types.sol";
import { PropositionPower } from "./utils/PropositionPower.sol";

/// @title Proposition Power Proposal Validation Strategy
/// @notice Strategy that limits proposal creation to authors that exceed a threshold proposition power
///         over a set of voting strategies.
contract PropositionPowerProposalValidationStrategy is PropositionPower, IProposalValidationStrategy {
    /// @notice Validates an author by checking if the proposition power of the author exceeds a threshold
    ///         over a set of strategies.
    /// @param author Author of the proposal.
    /// @param params ABI encoded array that should contain the proposal threshold and allowed voting strategies.
    /// @param userParams ABI encoded array that should contain the user voting strategies.
    function validate(
        address author,
        bytes calldata params,
        bytes calldata userParams
    ) external override returns (bool) {
        (uint256 proposalThreshold, Strategy[] memory allowedStrategies) = abi.decode(params, (uint256, Strategy[]));
        IndexedStrategy[] memory userStrategies = abi.decode(userParams, (IndexedStrategy[]));

        return _validate(author, proposalThreshold, allowedStrategies, userStrategies);
    }
}
