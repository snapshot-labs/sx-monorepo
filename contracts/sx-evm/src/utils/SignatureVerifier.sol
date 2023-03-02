// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { Choice, IndexedStrategy } from "src/types.sol";
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
            "IndexedStrategy[] userVotingStrategies,string voteMetadataUri)"
            "IndexedStrategy(uint8 index,bytes params)"
        );
    bytes32 private constant UPDATE_PROPOSAL_TYPEHASH =
        keccak256(
            "updateProposal(address space,address author,uint256 proposalId,"
            "IndexedStrategy executionStrategy,string metadataUri)"
            "IndexedStrategy(uint8 index,bytes params)"
        );

    mapping(address author => mapping(uint256 salt => bool used)) private usedSalts;

    // solhint-disable-next-line no-empty-blocks
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
        (
            address voter,
            uint256 proposeId,
            Choice choice,
            IndexedStrategy[] memory userVotingStrategies,
            string memory voteMetadataUri
        ) = abi.decode(data, (address, uint256, Choice, IndexedStrategy[], string));

        address recoveredAddress = ECDSA.recover(
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        VOTE_TYPEHASH,
                        space,
                        voter,
                        proposeId,
                        choice,
                        userVotingStrategies.hash(),
                        keccak256(bytes(voteMetadataUri))
                    )
                )
            ),
            v,
            r,
            s
        );

        if (recoveredAddress != voter) revert InvalidSignature();
    }

    function _verifyUpdateProposalSig(uint8 v, bytes32 r, bytes32 s, address space, bytes memory data) internal view {
        (address author, uint256 proposalId, IndexedStrategy memory executionStrategy, string memory metadataUri) = abi
            .decode(data, (address, uint256, IndexedStrategy, string));

        address recoveredAddress = ECDSA.recover(
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        UPDATE_PROPOSAL_TYPEHASH,
                        space,
                        author,
                        proposalId,
                        executionStrategy.hash(),
                        keccak256(bytes(metadataUri))
                    )
                )
            ),
            v,
            r,
            s
        );

        if (recoveredAddress != author) revert InvalidSignature();
    }
}
