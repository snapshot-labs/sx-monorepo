// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

interface ISpaceOwnerActions {

    function cancelProposal() external;

    function setController() external;

    function setQuorum() external;

    function setVotingDelay() external;

    function setMinVotingDuration() external;

    function setMaxVotingDuration() external;

    function setProposalThreshold() external;

    function setMetadataUri() external;

    function addVotingStrategies() external;

    function removeVotingStrategies() external;

    function addAuthenticators() external;

    function removeAuthenticators() external;

    function addExecutionStrategies() external;

    function removeExecutionStrategies() external;

}
