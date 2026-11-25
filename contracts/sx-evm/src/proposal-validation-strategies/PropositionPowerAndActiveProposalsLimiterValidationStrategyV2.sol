// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IProposalValidationStrategy } from "../interfaces/IProposalValidationStrategy.sol";
import { IndexedStrategy, Strategy } from "../types.sol";
import { ActiveProposalsLimiter } from "../utils/ActiveProposalsLimiter.sol";
import { PropositionPower } from "../utils/PropositionPower.sol";

/// @title Proposition Power and Active Proposals Limiter Proposal Validation Strategy V2
/// @notice Strategy that limits proposal creation to authors that exceed a threshold proposition power over a set of
///         voting strategies at a recent block, and a maximum number of active proposals.
/// @dev The author chooses the block, instead of the current block, so that strategies whose voting power is signed
///      offchain for a given block can be used. A cooldown of 0 disables the active proposals limit and skips its
///      storage, so maxActiveProposals is then ignored.
contract PropositionPowerAndActiveProposalsLimiterValidationStrategyV2 is
    ActiveProposalsLimiter,
    PropositionPower,
    IProposalValidationStrategy
{
    /// @notice Thrown when the block number is in the future or older than the maximum block age.
    error InvalidBlockNumber(uint32 blockNumber);

    /// @notice Validates an author by checking if the proposition power of the author at a recent block exceeds a
    ///         threshold over a set of strategies and if the author has reached the maximum number of active proposals.
    /// @param author Author of the proposal.
    /// @param params ABI encoded array that should contain the following:
    ///                 cooldown: Duration to wait before the proposal counter gets reset. 0 disables the limit.
    ///                 maxActiveProposals: Maximum number of active proposals per author. Must be != 0.
    ///                 proposalThreshold: Minimum proposition power required to create a proposal.
    ///                 allowedStrategies: Array of allowed voting strategies.
    ///                 maxBlockAge: Maximum number of blocks between the block chosen by the author and the current block.
    /// @param userParams ABI encoded array that should contain the following:
    ///                 blockNumber: Block at which the proposition power is computed.
    ///                 userStrategies: Array of user voting strategies.
    function validate(address author, bytes calldata params, bytes calldata userParams) external returns (bool) {
        (
            uint256 cooldown,
            uint256 maxActiveProposals,
            uint256 proposalThreshold,
            Strategy[] memory allowedStrategies,
            uint32 maxBlockAge
        ) = abi.decode(params, (uint256, uint256, uint256, Strategy[], uint32));
        (uint32 blockNumber, IndexedStrategy[] memory userStrategies) = abi.decode(
            userParams,
            (uint32, IndexedStrategy[])
        );
        if (blockNumber > block.number || block.number - blockNumber > maxBlockAge) {
            revert InvalidBlockNumber(blockNumber);
        }

        return
            (cooldown == 0 || ActiveProposalsLimiter._validate(author, cooldown, maxActiveProposals)) &&
            _getCumulativePower(author, blockNumber, userStrategies, allowedStrategies) >= proposalThreshold;
    }
}
