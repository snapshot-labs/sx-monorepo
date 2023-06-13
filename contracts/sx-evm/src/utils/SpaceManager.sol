// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title Space Manager
/// @notice Manages a whitelist of Spaces that are authorized to execute transactions via this contract.
contract SpaceManager is OwnableUpgradeable {
    /// @notice Thrown if a space is not in the whitelist.
    error InvalidSpace();

    mapping(address space => bool isEnabled) internal spaces;

    /// @notice Emitted when a space is enabled.
    event SpaceEnabled(address space);

    /// @notice Emitted when a space is disabled.
    event SpaceDisabled(address space);

    /// @notice Initialize the contract with a list of spaces. Called only once.
    /// @param _spaces List of spaces.
    // solhint-disable-next-line func-name-mixedcase
    function __SpaceManager_init(address[] memory _spaces) internal onlyInitializing {
        for (uint256 i = 0; i < _spaces.length; i++) {
            spaces[_spaces[i]] = true;
        }
    }

    /// @notice Enable a space.
    /// @param space Address of the space.
    function enableSpace(address space) external onlyOwner {
        if (space == address(0) || spaces[space]) revert InvalidSpace();
        spaces[space] = true;
        emit SpaceEnabled(space);
    }

    /// @notice Disable a space.
    /// @param space Address of the space.
    function disableSpace(address space) external onlyOwner {
        if (!spaces[space]) revert InvalidSpace();
        spaces[space] = false;
        emit SpaceDisabled(space);
    }

    /// @notice Check if a space is enabled.
    /// @param space Address of the space.
    /// @return bool whether the space is enabled.
    function isSpaceEnabled(address space) external view returns (bool) {
        return spaces[space];
    }

    modifier onlySpace() {
        if (!spaces[msg.sender]) revert InvalidSpace();
        _;
    }
}
