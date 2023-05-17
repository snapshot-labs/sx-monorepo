// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Strategy, UpdateSettingsInput } from "../../types.sol";

/// @title Space Owner Actions
/// @notice The actions that can be performed by the owner of a Space,
///         These are in addition to the methods exposed by the `OwnableUpgradeable` module and the
///         `upgradeTo()` method of `UUPSUpgradeable`.
interface ISpaceOwnerActions {
    /// @notice  Cancels a proposal that has not already been finalized.
    /// @param   proposalId  The proposal to cancel.
    function cancel(uint256 proposalId) external;

    /// @notice Updates the settings.
    /// @param input The settings to modify
    /// @dev The structure should consist of:
    ///     minVotingDuration The new minimum voting duration. Set to `NO_UPDATE_UINT32` to ignore.
    ///     maxVotingDuration The new maximum voting duration. Set to `NO_UPDATE_UINT32` to ignore.
    ///     votingDelay The new voting delay. Set to `NO_UPDATE_UINT32` to ignore.
    ///     metadataURI The new metadataURI. Set to `NO_UPDATE_STRING` to ignore.
    ///     daoURI The new daoURI. Set to `NO_UPDATE_STRING` to ignore.
    ///     proposalValidationStrategy The new proposal validation strategy to use. Set
    ///                 to `NO_UPDATE_STRATEGY` to ignore.
    ///     proposalValidationStrategyMetadataURI The new metadata URI for the proposal validation strategy.
    ///     authenticatorsToAdd The authenticators to add. Set to an empty array to ignore.
    ///     authenticatorsToRemove The authenticators to remove. Set to an empty array to ignore.
    ///     votingStrategiesToAdd The voting strategies to add. Set to an empty array to ignore.
    ///     votingStrategyMetadataURIsToAdd The voting strategy metadata uris to add. Set to
    ///                 an empty array to ignore.
    ///     votignStrategiesToRemove The indices of voting strategies to remove. Set to empty array to ignore.
    function updateSettings(UpdateSettingsInput calldata input) external;
}
