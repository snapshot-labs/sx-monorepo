// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "src/types.sol";
import { SXHash } from "src/utils/SXHash.sol";

abstract contract SignatureVerifier is EIP712 {
    using SXHash for IndexedStrategy[];
    using SXHash for IndexedStrategy;

    error InvalidSignature();
    error SaltAlreadyUsed();

    bytes32 private constant PROPOSE_TYPEHASH =
        keccak256(
            "Propose(address space,address author,string metadataUri,IndexedStrategy executionStrategy,"
            "IndexedStrategy[] userVotingStrategies,uint256 salt)"
            "IndexedStrategy(uint8 index,bytes params)"
        );
    bytes32 private constant VOTE_TYPEHASH =
        keccak256(
            "Vote(address space,address voter,uint256 proposalId,uint8 choice,"
            "IndexedStrategy[] userVotingStrategies)"
            "IndexedStrategy(uint8 index,bytes params)"
        );

    mapping(address => mapping(uint256 => bool)) private usedSalts;

    constructor(string memory name, string memory version) EIP712(name, version) {}

    function _verifyProposeSig(uint8 v, bytes32 r, bytes32 s, uint256 salt, address space, bytes memory data) internal {
        (
            address author,
            string memory metadataUri,
            IndexedStrategy memory executionStrategy,
            IndexedStrategy[] memory userVotingStrategies
        ) = abi.decode(data, (address, string, IndexedStrategy, IndexedStrategy[]));

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

    function _verifyVoteSig(uint8 v, bytes32 r, bytes32 s, address space, bytes memory data) internal view {
        (address voter, uint256 proposeId, Choice choice, IndexedStrategy[] memory userVotingStrategies) = abi.decode(
            data,
            (address, uint256, Choice, IndexedStrategy[])
        );

        address recoveredAddress = ECDSA.recover(
            _hashTypedDataV4(
                keccak256(abi.encode(VOTE_TYPEHASH, space, voter, proposeId, choice, userVotingStrategies.hash()))
            ),
            v,
            r,
            s
        );

        if (recoveredAddress != voter) revert InvalidSignature();
    }
}
