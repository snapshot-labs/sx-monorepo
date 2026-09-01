// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { TRUE, FALSE } from "../types.sol";

/// @title Space Manager
/// @notice Manages a whitelist of Spaces that are authorized to execute transactions via this contract.
contract SpaceManager is OwnableUpgradeable {
    /// @notice Thrown if a space is not in the whitelist.
    error InvalidSpace();

    mapping(address space => uint256 isEnabled) internal spaces;

    /// @notice Emitted when a space is enabled.
    event SpaceEnabled(address space);

    /// @notice Emitted when a space is disabled.
    event SpaceDisabled(address space);

    /// @notice Initialize the contract with a list of spaces. Called only once.
    /// @param _spaces List of spaces.
    // solhint-disable-next-line func-name-mixedcase
    function __SpaceManager_init(address[] memory _spaces) internal onlyInitializing {
        for (uint256 i = 0; i < _spaces.length; i++) {
            spaces[_spaces[i]] = TRUE;
        }
    }

    /// @notice Enable a space.
    /// @param space Address of the space.
    function enableSpace(address space) external onlyOwner {
        if (space == address(0) || (spaces[space] != FALSE)) revert InvalidSpace();
        spaces[space] = TRUE;
        emit SpaceEnabled(space);
    }

    /// @notice Disable a space.
    /// @param space Address of the space.
    function disableSpace(address space) external onlyOwner {
        if (spaces[space] == FALSE) revert InvalidSpace();
        spaces[space] = FALSE;
        emit SpaceDisabled(space);
    }

    /// @notice Check if a space is enabled.
    /// @param space Address of the space.
    /// @return uint256 whether the space is enabled.
    function isSpaceEnabled(address space) external view returns (uint256) {
        return spaces[space];
    }

    modifier onlySpace() {
        if (spaces[msg.sender] == FALSE) revert InvalidSpace();
        _;
    }
}
