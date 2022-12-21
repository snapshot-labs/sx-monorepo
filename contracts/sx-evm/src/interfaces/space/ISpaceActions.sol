// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

interface ISpaceActions {
    function propose() external;

    function vote() external;

    function finalize() external;
}
