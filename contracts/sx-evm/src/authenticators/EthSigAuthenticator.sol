// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Authenticator } from "./Authenticator.sol";
import { SignatureVerifier } from "../utils/SignatureVerifier.sol";

/// @title Ethereum Signature Authenticator
contract EthSigAuthenticator is Authenticator, SignatureVerifier {
    error InvalidFunctionSelector();

    // solhint-disable-next-line no-empty-blocks
    constructor(string memory name, string memory version) SignatureVerifier(name, version) {}

    /// @notice Authenticates a user by verifying an EIP712 signature.
    /// @param v The v component of the signature.
    /// @param r The r component of the signature.
    /// @param s The s component of the signature.
    /// @param salt The salt used to generate the signature.
    /// @param target The target Space contract address.
    /// @param functionSelector The function selector of the function to be called.
    function authenticate(
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint256 salt,
        address target,
        bytes4 functionSelector,
        bytes calldata data
    ) external {
        if (functionSelector == PROPOSE_SELECTOR) {
            _verifyProposeSig(v, r, s, salt, target, data);
        } else if (functionSelector == VOTE_SELECTOR) {
            _verifyVoteSig(v, r, s, target, data);
        } else if (functionSelector == UPDATE_PROPOSAL_SELECTOR) {
            _verifyUpdateProposalSig(v, r, s, salt, target, data);
        } else {
            revert InvalidFunctionSelector();
        }
        _call(target, functionSelector, data);
    }
}
