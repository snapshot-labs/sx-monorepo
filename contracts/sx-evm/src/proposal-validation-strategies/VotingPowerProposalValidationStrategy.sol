// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IProposalValidationStrategy } from "../interfaces/IProposalValidationStrategy.sol";
import { IndexedStrategy, Strategy } from "../types.sol";
import { ISpace } from "../interfaces/ISpace.sol";
import { GetCumulativePower } from "../utils/GetCumulativePower.sol";

contract VotingPowerProposalValidationStrategy is IProposalValidationStrategy {
    using GetCumulativePower for address;

    /**
     * @notice  Validates a proposal using the voting strategies to compute the proposal power.
     * @param   author  Author of the proposal
     * @param   userParams  User provided parameters for the voting strategies
     * @param   params  Bytes that should decode to proposalThreshold and allowedStrategies
     * @return  bool  Whether the proposal should be validated or not
     */
    function validate(
        address author,
        bytes calldata params,
        bytes calldata userParams
    ) external override returns (bool) {
        (uint256 proposalThreshold, Strategy[] memory allowedStrategies) = abi.decode(params, (uint256, Strategy[]));
        IndexedStrategy[] memory userStrategies = abi.decode(userParams, (IndexedStrategy[]));

        uint256 votingPower = author.getCumulativePower(uint32(block.timestamp), userStrategies, allowedStrategies);

        return (votingPower >= proposalThreshold);
    }
}
