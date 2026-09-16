// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Authenticator } from "./Authenticator.sol";
import { Choice, IndexedStrategy, Strategy } from "../types.sol";

/// @title Ethereum Transaction Authenticator
contract EthTxAuthenticator is Authenticator {
    error InvalidFunctionSelector();
    error InvalidMessageSender();

    /// @notice Authenticates a user by ensuring the sender address corresponds to the voter/author.
    /// @param target The target Space contract address.
    /// @param functionSelector The function selector of the function to be called.
    /// @param data The calldata of the function to be called.
    function authenticate(address target, bytes4 functionSelector, bytes calldata data) external {
        if (functionSelector == PROPOSE_SELECTOR) {
            _verifyPropose(data);
        } else if (functionSelector == VOTE_SELECTOR) {
            _verifyVote(data);
        } else if (functionSelector == UPDATE_PROPOSAL_SELECTOR) {
            _verifyUpdateProposal(data);
        } else {
            revert InvalidFunctionSelector();
        }
        _call(target, functionSelector, data);
    }

    /// @dev Verifies a proposal creation transaction.
    function _verifyPropose(bytes calldata data) internal view {
        (address author, , , ) = abi.decode(data, (address, string, Strategy, bytes));
        if (author != msg.sender) revert InvalidMessageSender();
    }

    /// @dev Verifies a vote transaction.
    function _verifyVote(bytes calldata data) internal view {
        (address voter, , , ) = abi.decode(data, (address, uint256, Choice, IndexedStrategy[]));
        if (voter != msg.sender) revert InvalidMessageSender();
    }

    /// @dev Verifies a proposal update transaction.
    function _verifyUpdateProposal(bytes calldata data) internal view {
        (address author, , , ) = abi.decode(data, (address, uint256, Strategy, string));
        if (author != msg.sender) revert InvalidMessageSender();
    }
}
