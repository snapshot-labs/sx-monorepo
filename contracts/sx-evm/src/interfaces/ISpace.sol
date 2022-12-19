// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "./space/ISpaceState.sol";
import "./space/ISpaceActions.sol";
import "./space/ISpaceOwnerActions.sol";
import "./space/ISpaceEvents.sol";


interface ISpace is 
    ISpaceState,
    ISpaceActions,
    ISpaceOwnerActions, 
    ISpaceEvents, 
    IModule
{

}