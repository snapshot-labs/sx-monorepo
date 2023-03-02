// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title Space Manager - A contract that manages spaces that are able to execute transactions via this contract
/// @author Snapshot Labs
contract SpaceManager is OwnableUpgradeable {
    error InvalidSpace();

    mapping(address space => bool isEnabled) internal spaces;

    /// @notice Emitted when a space is enabled.
    event SpaceEnabled(address space);

    /// @notice Emitted when a space is disabled.
    event SpaceDisabled(address space);

    /// @notice Initialize the contract with a list of spaces. Called only once.
    /// @param _spaces List of spaces.
    // solhint-disable-next-line func-name-mixedcase
    function __SpaceManager_init(address[] memory _spaces) internal initializer {
        for (uint256 i = 0; i < _spaces.length; i++) {
            spaces[_spaces[i]] = true;
        }
    }

    /// @notice Enable a space.
    /// @param space Address of the space.
    function enableSpace(address space) public onlyOwner {
        if (space == address(0) || isSpaceEnabled(space)) revert InvalidSpace();
        spaces[space] = true;
        emit SpaceEnabled(space);
    }

    /// @notice Disable a space.
    /// @param space Address of the space.
    function disableSpace(address space) public onlyOwner {
        if (!spaces[space]) revert InvalidSpace();
        spaces[space] = false;
        emit SpaceDisabled(space);
    }

    /// @notice Check if a space is enabled.
    /// @param space Address of the space.
    /// @return bool whether the space is enabled.
    function isSpaceEnabled(address space) public view returns (bool) {
        return spaces[space];
    }

    modifier onlySpace(address callerAddress) {
        if (!isSpaceEnabled(callerAddress)) revert InvalidSpace();
        _;
    }
}
