// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Strategy } from "../../types.sol";

/// @title Space Owner Actions
/// @notice The actions that can be performed by the owner of a Space,
///         These are in addition to the methods exposed by the `OwnableUpgradeable` module and the
///         `upgradeTo()` method of `UUPSUpgradeable`.
interface ISpaceOwnerActions {
    /// @notice  Cancels a proposal that has not already been finalized.
    /// @param   proposalId  The proposal to cancel.
    function cancel(uint256 proposalId) external;

    /// @notice Sets the voting delay.
    /// @param delay The new voting delay.
    function setVotingDelay(uint32 delay) external;

    /// @notice Sets the minimum voting duration.
    /// @param duration The new minimum voting duration.
    function setMinVotingDuration(uint32 duration) external;

    /// @notice Sets the maximum voting duration.
    /// @param duration The new maximum voting duration.
    function setMaxVotingDuration(uint32 duration) external;

    /// @notice Sets the proposal validation strategy.
    /// @param proposalValidationStrategy The new proposal validation strategy.
    function setProposalValidationStrategy(Strategy calldata proposalValidationStrategy) external;

    /// @notice Sets the metadata URI for the Space.
    /// @param metadataURI The new metadata URI.
    function setMetadataURI(string calldata metadataURI) external;

    /// @notice Adds an array of voting strategies.
    /// @param votingStrategies The array of voting strategies to add.
    /// @param votingStrategyMetadataURIs The array of metadata URIs for `votingStrategies`.
    function addVotingStrategies(
        Strategy[] calldata votingStrategies,
        string[] calldata votingStrategyMetadataURIs
    ) external;

    /// @notice Removes an array of voting strategies.
    /// @param indicesToRemove The array of indices of the voting strategies to remove.
    function removeVotingStrategies(uint8[] calldata indicesToRemove) external;

    /// @notice Adds an array of authenticators.
    /// @param authenticators The array of authenticator addresses to add.
    function addAuthenticators(address[] calldata authenticators) external;

    /// @notice Removes an array of authenticators.
    /// @param authenticators The array of authenticator addresses to remove.
    function removeAuthenticators(address[] calldata authenticators) external;
}
