// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Choice, IndexedStrategy, Strategy } from "../../src/types.sol";
import { SXHash } from "../../src/utils/SXHash.sol";

abstract contract SigUtils {
    using SXHash for Strategy;
    using SXHash for IndexedStrategy[];
    using SXHash for IndexedStrategy;

    string private name;
    string private version;
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 private constant PROPOSE_TYPEHASH =
        keccak256(
            "Propose(address space,address author,string metadataURI,Strategy executionStrategy,"
            "bytes userParams,uint256 salt)"
            "Strategy(address addy,bytes params)"
        );
    bytes32 private constant VOTE_TYPEHASH =
        keccak256(
            "Vote(address space,address voter,uint256 proposalId,uint8 choice,"
            "IndexedStrategy[] userVotingStrategies,string voteMetadataURI)"
            "IndexedStrategy(uint8 index,bytes params)"
        );
    bytes32 private constant UPDATE_PROPOSAL_TYPEHASH =
        keccak256(
            "updateProposal(address space,address author,uint256 proposalId,"
            "Strategy executionStrategy,string metadataURI)"
            "Strategy(address addy,bytes params)"
        );

    constructor(string memory _name, string memory _version) {
        name = _name;
        version = _version;
    }

    function _getProposeDigest(
        address authenticator,
        address space,
        address author,
        string memory metadataURI,
        Strategy memory executionStrategy,
        bytes memory userParams,
        uint256 salt
    ) internal view returns (bytes32) {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                keccak256(
                    abi.encode(
                        DOMAIN_TYPEHASH,
                        keccak256(bytes(name)),
                        keccak256(bytes(version)),
                        block.chainid,
                        authenticator
                    )
                ),
                keccak256(
                    abi.encode(
                        PROPOSE_TYPEHASH,
                        space,
                        author,
                        keccak256(bytes(metadataURI)),
                        executionStrategy.hash(),
                        keccak256(userParams),
                        salt
                    )
                )
            )
        );

        return digest;
    }

    function _getVoteDigest(
        address authenticator,
        address space,
        address voter,
        uint256 proposalId,
        Choice choice,
        IndexedStrategy[] memory usedVotingStrategies,
        string memory voteMetadataURI
    ) internal view returns (bytes32) {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                keccak256(
                    abi.encode(
                        DOMAIN_TYPEHASH,
                        keccak256(bytes(name)),
                        keccak256(bytes(version)),
                        block.chainid,
                        authenticator
                    )
                ),
                keccak256(
                    abi.encode(
                        VOTE_TYPEHASH,
                        space,
                        voter,
                        proposalId,
                        choice,
                        usedVotingStrategies.hash(),
                        keccak256(bytes(voteMetadataURI))
                    )
                )
            )
        );

        return digest;
    }

    function _getUpdateProposalDigest(
        address authenticator,
        address space,
        address author,
        uint256 proposalId,
        Strategy memory executionStrategy,
        string memory metadataURI
    ) internal view returns (bytes32) {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                keccak256(
                    abi.encode(
                        DOMAIN_TYPEHASH,
                        keccak256(bytes(name)),
                        keccak256(bytes(version)),
                        block.chainid,
                        authenticator
                    )
                ),
                keccak256(
                    abi.encode(
                        UPDATE_PROPOSAL_TYPEHASH,
                        space,
                        author,
                        proposalId,
                        executionStrategy.hash(),
                        keccak256(bytes(metadataURI))
                    )
                )
            )
        );

        return digest;
    }
}
