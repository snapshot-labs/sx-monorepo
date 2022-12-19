// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

interface ISpaceActions {

    function proposeByTx() external;

    function proposeBySig() external;

    function voteByTx() external;

    function voteBySig() external;

    function execute() external;
}