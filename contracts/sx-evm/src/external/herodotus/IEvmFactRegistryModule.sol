// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.18;

// Vendored from HerodotusDev/herodotus-evm-v2, branch feat/apechain-fact-registry-3,
// src/interfaces/modules/IEvmFactRegistryModule.sol
//
// Reduced to the members ApeGasVotingStrategy calls. BlockHeaderField is kept
// complete because callers pass its members by value: TIMESTAMP must stay 11.
interface IEvmFactRegistryModule {
    enum BlockHeaderField {
        PARENT_HASH, // 0
        OMMERS_HASH, // 1
        BENEFICIARY, // 2
        STATE_ROOT, // 3
        RECEIPTS_ROOT, // 4
        TRANSACTION_ROOT, // 5
        LOGS_BLOOM, // 6
        DIFFICULTY, // 7
        NUMBER, // 8
        GAS_LIMIT, // 9
        GAS_USED, // 10
        TIMESTAMP, // 11
        EXTRA_DATA, // 12
        MIX_HASH, // 13
        NONCE // 14
    }

    /// @notice Returns block header field (e.g. block hash, state root or timestamp) of a block
    ///   with a given block number on a given chain id.
    /// @notice Reverts with "STORAGE_PROOF_HEADER_FIELD_NOT_SAVED" if the field is not saved.
    function headerField(uint256 chainId, uint256 blockNumber, BlockHeaderField field) external view returns (bytes32);

    /// @notice Returns block number with a biggest timestamp that is less than or equal to the given timestamp.
    /// @notice Reverts with "STORAGE_PROOF_TIMESTAMP_NOT_SAVED" if the timestamp is not saved.
    function timestamp(uint256 chainId, uint256 timestamp) external view returns (uint256);
}
