// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { IVotingStrategy } from "../interfaces/IVotingStrategy.sol";
import { SignatureChecker } from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title Oracle Voting Strategy
/// @notice Uses voting power attested by an oracle, an EOA or an EIP-1271 contract such as a Safe, that signs
///         an EIP-712 `Score` message.
/// @dev The attested voting power must be a pure function of (params, blockNumber, voter): anything that
///      affects the score, including the space, must be encoded in the oracle params. Not usable for proposition
///      power, which is checked at the current block and so cannot be attested in advance.
contract OracleVotingStrategy is IVotingStrategy, EIP712 {
    /// @notice Thrown when the oracle signature is invalid.
    error InvalidSignature();

    bytes32 private constant SCORE_TYPEHASH =
        keccak256("Score(bytes params,uint256 votingPower,uint32 blockNumber,address voter)");

    // solhint-disable-next-line no-empty-blocks
    constructor(string memory name, string memory version) EIP712(name, version) {}

    /// @param params `abi.encode(address oracle, bytes params)`, set in the space.
    /// @param userParams `abi.encode(uint256 votingPower, bytes signature)`, sent by the voter.
    function getVotingPower(
        uint32 blockNumber,
        address voter,
        bytes calldata params,
        bytes calldata userParams
    ) external view override returns (uint256) {
        (address oracle, bytes memory oracleParams) = abi.decode(params, (address, bytes));
        (uint256 votingPower, bytes memory signature) = abi.decode(userParams, (uint256, bytes));

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(SCORE_TYPEHASH, keccak256(oracleParams), votingPower, blockNumber, voter))
        );
        if (!SignatureChecker.isValidSignatureNow(oracle, digest, signature)) revert InvalidSignature();

        return votingPower;
    }
}
