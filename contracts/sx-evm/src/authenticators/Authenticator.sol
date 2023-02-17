// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

abstract contract Authenticator {
    bytes4 internal constant PROPOSE_SELECTOR =
        bytes4(keccak256("propose(address,string,(address,bytes),(uint8,bytes)[])"));
    bytes4 constant VOTE_SELECTOR = bytes4(keccak256("vote(address,uint256,uint8,(uint8,bytes)[])"));

    function _call(address target, bytes4 functionSelector, bytes memory data) internal {
        (bool success, ) = target.call(abi.encodePacked(functionSelector, data));
        if (!success) {
            // If the call failed, we revert with the propagated error message.
            assembly {
                let returnDataSize := returndatasize()
                returndatacopy(0, 0, returnDataSize)
                revert(0, returnDataSize)
            }
        }
    }
}
