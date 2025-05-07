// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { Test } from "forge-std/Test.sol";
import { Merkle } from "@murky/Merkle.sol";
import { MerkleWhitelistVotingStrategy } from "../src/voting-strategies/MerkleWhitelistVotingStrategy.sol";

contract MerkleWhitelistVotingStrategyTest is Test {
    error InvalidProof();
    error InvalidMember();

    MerkleWhitelistVotingStrategy public merkleWhitelistVotingStrategy;
    Merkle public merkleLib;

    function setUp() public {
        merkleWhitelistVotingStrategy = new MerkleWhitelistVotingStrategy();
        merkleLib = new Merkle();
    }

    function testMerkleWhitelistVotingPower() public view {
        MerkleWhitelistVotingStrategy.Member[] memory members = new MerkleWhitelistVotingStrategy.Member[](4);
        members[0] = MerkleWhitelistVotingStrategy.Member(address(3), 33);
        members[1] = MerkleWhitelistVotingStrategy.Member(address(1), 11);
        members[2] = MerkleWhitelistVotingStrategy.Member(address(5), 55);
        members[3] = MerkleWhitelistVotingStrategy.Member(address(5), 77);

        bytes32[] memory leaves = new bytes32[](4);
        leaves[0] = keccak256(bytes.concat(keccak256(abi.encode(members[0]))));
        leaves[1] = keccak256(bytes.concat(keccak256(abi.encode(members[1]))));
        leaves[2] = keccak256(bytes.concat(keccak256(abi.encode(members[2]))));
        leaves[3] = keccak256(bytes.concat(keccak256(abi.encode(members[3]))));

        bytes32 root = merkleLib.getRoot(leaves);

        assertEq(
            merkleWhitelistVotingStrategy.getVotingPower(
                0,
                members[0].addr,
                abi.encode(root),
                abi.encode(merkleLib.getProof(leaves, 0), members[0])
            ),
            members[0].vp
        );
        assertEq(
            merkleWhitelistVotingStrategy.getVotingPower(
                0,
                members[1].addr,
                abi.encode(root),
                abi.encode(merkleLib.getProof(leaves, 1), members[1])
            ),
            members[1].vp
        );
        assertEq(
            merkleWhitelistVotingStrategy.getVotingPower(
                0,
                members[2].addr,
                abi.encode(root),
                abi.encode(merkleLib.getProof(leaves, 2), members[2])
            ),
            members[2].vp
        );
        assertEq(
            merkleWhitelistVotingStrategy.getVotingPower(
                0,
                members[3].addr,
                abi.encode(root),
                abi.encode(merkleLib.getProof(leaves, 3), members[3])
            ),
            members[3].vp
        );
    }

    function testMerkleWhitelistInvalidProof() public {
        MerkleWhitelistVotingStrategy.Member[] memory members = new MerkleWhitelistVotingStrategy.Member[](4);
        members[0] = MerkleWhitelistVotingStrategy.Member(address(3), 33);
        members[1] = MerkleWhitelistVotingStrategy.Member(address(1), 11);
        members[2] = MerkleWhitelistVotingStrategy.Member(address(5), 55);
        members[3] = MerkleWhitelistVotingStrategy.Member(address(5), 77);

        bytes32[] memory leaves = new bytes32[](4);
        leaves[0] = keccak256(bytes.concat(keccak256(abi.encode(members[0]))));
        leaves[1] = keccak256(bytes.concat(keccak256(abi.encode(members[1]))));
        leaves[2] = keccak256(bytes.concat(keccak256(abi.encode(members[2]))));
        leaves[3] = keccak256(bytes.concat(keccak256(abi.encode(members[3]))));

        bytes32 root = merkleLib.getRoot(leaves);

        // Proof is empty
        vm.expectRevert(InvalidProof.selector);
        merkleWhitelistVotingStrategy.getVotingPower(
            0,
            members[0].addr,
            abi.encode(root),
            abi.encode(new bytes32[](0), members[0])
        );
    }

    function testMerkleWhitelistInvalidMember() public {
        MerkleWhitelistVotingStrategy.Member[] memory members = new MerkleWhitelistVotingStrategy.Member[](4);
        members[0] = MerkleWhitelistVotingStrategy.Member(address(3), 33);
        members[1] = MerkleWhitelistVotingStrategy.Member(address(1), 11);
        members[2] = MerkleWhitelistVotingStrategy.Member(address(5), 55);
        members[3] = MerkleWhitelistVotingStrategy.Member(address(5), 77);

        bytes32[] memory leaves = new bytes32[](4);
        leaves[0] = keccak256(bytes.concat(keccak256(abi.encode(members[0]))));
        leaves[1] = keccak256(bytes.concat(keccak256(abi.encode(members[1]))));
        leaves[2] = keccak256(bytes.concat(keccak256(abi.encode(members[2]))));
        leaves[3] = keccak256(bytes.concat(keccak256(abi.encode(members[3]))));

        bytes32 root = merkleLib.getRoot(leaves);

        bytes32[] memory proof = merkleLib.getProof(leaves, 2);

        // Proof is for a different member than the voter address
        vm.expectRevert(InvalidMember.selector);
        merkleWhitelistVotingStrategy.getVotingPower(
            0,
            members[1].addr,
            abi.encode(root),
            abi.encode(proof, members[2])
        );
    }

    function testLargeMerkleWhitelist() public view {
        uint256 numMembers = 100;
        MerkleWhitelistVotingStrategy.Member[] memory members = new MerkleWhitelistVotingStrategy.Member[](numMembers);
        for (uint256 i = 0; i < numMembers; i++) {
            members[i] = MerkleWhitelistVotingStrategy.Member(address(uint160(i)), uint96(i));
        }

        bytes32[] memory leaves = new bytes32[](numMembers);
        for (uint256 i = 0; i < numMembers; i++) {
            leaves[i] = keccak256(bytes.concat(keccak256(abi.encode(members[i]))));
        }

        bytes32 root = merkleLib.getRoot(leaves);

        for (uint256 i = 0; i < numMembers; i++) {
            assertEq(
                merkleWhitelistVotingStrategy.getVotingPower(
                    0,
                    members[i].addr,
                    abi.encode(root),
                    abi.encode(merkleLib.getProof(leaves, i), members[i])
                ),
                members[i].vp
            );
        }
    }
}
