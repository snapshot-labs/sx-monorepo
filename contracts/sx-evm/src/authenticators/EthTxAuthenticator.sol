// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "./Authenticator.sol";
import "../types.sol";

/**
 * @author  SnapshotLabs
 * @title   EthTxAuthenticator
 * @notice  Authenticates a vote / a proposal by ensuring `msg.sender`
 *          corresponds to the voter / proposal author.
 */

contract EthTxAuthenticator is Authenticator {
    error InvalidFunctionSelector();
    error InvalidMessageSender();

    /**
     * @notice  Internal function to verify that the msg sender is indeed the proposal author
     * @param   data  The data to verify
     */
    function _verifyPropose(bytes calldata data) internal view {
        (address author, , , ) = abi.decode(data, (address, string, Strategy, IndexedStrategy[]));
        if (author != msg.sender) revert InvalidMessageSender();
    }

    /**
     * @notice  Internal function to verify that the msg sender is indeed the voter
     * @param   data  The data to verify
     */
    function _verifyVote(bytes calldata data) internal view {
        (address voter, , , ) = abi.decode(data, (address, uint256, Choice, IndexedStrategy[]));
        if (voter != msg.sender) revert InvalidMessageSender();
    }

    function authenticate(address target, bytes4 functionSelector, bytes calldata data) external {
        if (functionSelector == PROPOSE_SELECTOR) {
            _verifyPropose(data);
        } else if (functionSelector == VOTE_SELECTOR) {
            _verifyVote(data);
        } else {
            revert InvalidFunctionSelector();
        }
        _call(target, functionSelector, data);
    }
}
