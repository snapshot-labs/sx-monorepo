// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Strategy } from "../../types.sol";

interface ISpaceOwnerActions {
    function cancel(uint256 proposalId) external;

    function setController(address controller) external;

    function setVotingDelay(uint32 delay) external;

    function setMinVotingDuration(uint32 duration) external;

    function setMaxVotingDuration(uint32 duration) external;

    function setProposalThreshold(uint256 threshold) external;

    function setMetadataURI(string calldata metadataURI) external;

    function addVotingStrategies(
        Strategy[] calldata votingStrategies,
        string[] calldata votingStrategyMetadataURIs
    ) external;

    function removeVotingStrategies(uint8[] calldata indicesToRemove) external;

    function addAuthenticators(address[] calldata _authenticators) external;

    function removeAuthenticators(address[] calldata _authenticators) external;

    function addExecutionStrategies(Strategy[] calldata _executionStrategies) external;

    function removeExecutionStrategies(uint8[] calldata _executionStrategies) external;
}
