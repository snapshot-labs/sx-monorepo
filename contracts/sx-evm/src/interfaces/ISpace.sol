// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { ISpaceState } from "./space/ISpaceState.sol";
import { ISpaceActions } from "./space/ISpaceActions.sol";
import { ISpaceOwnerActions } from "./space/ISpaceOwnerActions.sol";
import { ISpaceEvents } from "./space/ISpaceEvents.sol";
import { ISpaceErrors } from "./space/ISpaceErrors.sol";

/// @title Space Interface
// solhint-disable-next-line no-empty-blocks
interface ISpace is ISpaceState, ISpaceActions, ISpaceOwnerActions, ISpaceEvents, ISpaceErrors {

}
