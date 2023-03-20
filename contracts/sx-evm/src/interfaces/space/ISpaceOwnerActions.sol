// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Strategy } from "../../types.sol";

interface ISpaceOwnerActions {
    function cancel(uint256 proposalId) external;

    function setVotingDelay(uint32 delay) external;

    function setMinVotingDuration(uint32 duration) external;

    function setMaxVotingDuration(uint32 duration) external;

    function setProposalValidationStrategy(Strategy calldata proposalValidationStrategy) external;

    function setMetadataURI(string calldata metadataURI) external;

    function addVotingStrategies(
        Strategy[] calldata votingStrategies,
        string[] calldata votingStrategyMetadataURIs
    ) external;

    function removeVotingStrategies(uint8[] calldata indicesToRemove) external;

    function addAuthenticators(address[] calldata _authenticators) external;

    function removeAuthenticators(address[] calldata _authenticators) external;
}
