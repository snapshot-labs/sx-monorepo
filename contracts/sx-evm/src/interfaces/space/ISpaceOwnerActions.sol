// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "../../types.sol";

interface ISpaceOwnerActions {
    function cancelProposal(uint256 proposalId, bytes calldata executionParams) external;

    function setController(uint256 controller) external;

    function setQuorum(uint256 quorum) external;

    function setVotingDelay(uint32 delay) external;

    function setMinVotingDuration(uint32 duration) external;

    function setMaxVotingDuration(uint32 duration) external;

    function setProposalThreshold(uint256 threshold) external;

    function setMetadataUri(string calldata metadataUri) external;

    function addVotingStrategies(Strategy[] calldata _votingStrategies) external;

    function removeVotingStrategies(uint8[] calldata indicesToRemove) external;

    function addAuthenticators(address[] calldata _authenticators) external;

    function removeAuthenticators(address[] calldata _authenticators) external;

    function addExecutionStrategies(address[] calldata _executionStrategies) external;

    function removeExecutionStrategies(address[] calldata _executionStrategies) external;
}
