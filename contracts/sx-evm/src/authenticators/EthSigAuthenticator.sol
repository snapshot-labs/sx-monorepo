// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "./Authenticator.sol";
import "../utils/SignatureVerifier.sol";

contract EthSigAuthenticator is Authenticator, SignatureVerifier {
    error InvalidFunctionSelector();

    constructor(string memory name, string memory version) SignatureVerifier(name, version) {}

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
            _verifyVoteSig(v, r, s, salt, target, data);
        } else {
            revert InvalidFunctionSelector();
        }
        _call(target, functionSelector, data);
    }
}
