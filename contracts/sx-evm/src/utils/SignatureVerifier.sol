// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "src/types.sol";
import { SOCHash } from "src/utils/SOCHash.sol";

abstract contract SignatureVerifier is EIP712 {
    using SOCHash for Strategy;
    using SOCHash for IndexedStrategy[];

    error InvalidSignature();
    error SaltAlreadyUsed();

    bytes32 private constant PROPOSE_TYPEHASH =
        keccak256(
            "Propose(address space,address author,string metadataUri,Strategy executionStrategy,"
            "IndexedStrategy[] userVotingStrategies,uint256 salt)"
            "IndexedStrategy(uint8 index,bytes params)"
            "Strategy(address addy,bytes params)"
        );
    bytes32 private constant VOTE_TYPEHASH =
        keccak256(
            "Vote(address space,address voter,uint256 proposalId,Choice choice,"
            "IndexedStrategy[] userVotingStrategies,uint256 salt)"
            "IndexedStrategy(uint8 index,bytes params)"
        );

    mapping(address => mapping(uint256 => bool)) private usedSalts;

    constructor(string memory name, string memory version) EIP712(name, version) {}

    function _verifyProposeSig(uint8 v, bytes32 r, bytes32 s, uint256 salt, address space, bytes memory data) internal {
        (
            address author,
            string memory metadataUri,
            Strategy memory executionStrategy,
            IndexedStrategy[] memory userVotingStrategies
        ) = abi.decode(data, (address, string, Strategy, IndexedStrategy[]));

        if (usedSalts[author][salt]) revert SaltAlreadyUsed();

        address recoveredAddress = ECDSA.recover(
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        PROPOSE_TYPEHASH,
                        space,
                        author,
                        keccak256(bytes(metadataUri)),
                        executionStrategy.hash(),
                        userVotingStrategies.hash(),
                        salt
                    )
                )
            ),
            v,
            r,
            s
        );

        if (recoveredAddress != author) revert InvalidSignature();

        // Mark salt as used to prevent replay attacks
        usedSalts[author][salt] = true;
    }

    function _verifyVoteSig(uint8 v, bytes32 r, bytes32 s, uint256 salt, address space, bytes memory data) internal {
        (address voter, uint256 proposeId, Choice choice, IndexedStrategy[] memory userVotingStrategies) = abi.decode(
            data,
            (address, uint256, Choice, IndexedStrategy[])
        );

        if (usedSalts[voter][salt]) revert SaltAlreadyUsed();

        address recoveredAddress = ECDSA.recover(
            _hashTypedDataV4(
                keccak256(
                    abi.encode(VOTE_TYPEHASH, space, voter, proposeId, uint8(choice), userVotingStrategies.hash(), salt)
                )
            ),
            v,
            r,
            s
        );

        if (recoveredAddress != voter) revert InvalidSignature();

        // Mark salt as used to prevent replay attacks
        usedSalts[voter][salt] = true;
    }
}
