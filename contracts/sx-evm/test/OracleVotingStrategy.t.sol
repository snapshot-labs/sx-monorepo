// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { SpaceTest } from "./utils/Space.t.sol";
import { OracleVotingStrategy } from "../src/voting-strategies/OracleVotingStrategy.sol";
import { Choice, IndexedStrategy, Strategy } from "../src/types.sol";

interface ISafeProxyFactory {
    function createProxyWithNonce(address singleton, bytes memory initializer, uint256 salt) external returns (address);
}

interface ISafeFallbackHandler {
    function getMessageHashForSafe(address safe, bytes memory message) external view returns (bytes32);
}

/// @dev The Safe is deployed from the official v1.4.1 build artifacts, identical to the canonical deployments.
contract OracleVotingStrategyTest is SpaceTest {
    string private constant SAFE_ARTIFACTS = "node_modules/@safe-global/safe-contracts/build/artifacts/contracts/";
    uint256 private constant ORACLE_KEY = 1; // EOA oracle, and first of the 2-of-3 Safe owners (keys 1, 2, 3)
    uint256 private constant VP = 42e18;
    bytes private constant PARAMS = "params";

    OracleVotingStrategy private strategy;
    ISafeFallbackHandler private safeHandler;
    address private safe;

    function setUp() public override {
        strategy = new OracleVotingStrategy("snapshot-x", "1.0.0");
        safeHandler = ISafeFallbackHandler(_deploySafe("handler/", "CompatibilityFallbackHandler"));
        address[] memory owners = new address[](3);
        for (uint256 i = 0; i < 3; i++) owners[i] = vm.addr(i + 1);
        bytes memory setup = abi.encodeWithSignature(
            "setup(address[],uint256,address,bytes,address,address,uint256,address)",
            owners,
            2,
            address(0),
            "",
            address(safeHandler),
            address(0),
            0,
            address(0)
        );
        safe = ISafeProxyFactory(_deploySafe("proxies/", "SafeProxyFactory")).createProxyWithNonce(
            _deploySafe("", "Safe"),
            setup,
            0
        );

        // The space's first voting strategy uses the Safe as oracle
        votingStrategies.push(Strategy(address(strategy), abi.encode(safe, PARAMS)));
        votingStrategyMetadataURIs.push("OracleVotingStrategy");
        super.setUp();
    }

    function testVoteWithSafeOracle() public {
        uint256 proposalId = _createProposal(author, proposalMetadataURI, executionStrategy, new bytes(0));
        bytes32 digest = _digest(address(strategy), PARAMS, VP, uint32(block.number), voter);
        IndexedStrategy[] memory strategies = new IndexedStrategy[](1);
        strategies[0] = IndexedStrategy(0, abi.encode(VP, _safeSign(1, 3, digest)));

        _vote(voter, proposalId, Choice.For, strategies, voteMetadataURI);

        assertEq(space.votePower(proposalId, Choice.For), VP);
    }

    function testGetVotingPower(uint256 vp, uint32 blockNumber, address user, bytes memory params) public view {
        bytes memory signature = _sign(ORACLE_KEY, _digest(address(strategy), params, vp, blockNumber, user));

        assertEq(
            strategy.getVotingPower(
                blockNumber,
                user,
                abi.encode(vm.addr(ORACLE_KEY), params),
                abi.encode(vp, signature)
            ),
            vp
        );
    }

    function testGetVotingPowerInvalidScore() public {
        bytes memory params = abi.encode(vm.addr(ORACLE_KEY), PARAMS);
        bytes memory signature = _sign(ORACLE_KEY, _digest(address(strategy), PARAMS, VP, 1, voter));

        _expectInvalid(2, voter, params, abi.encode(VP, signature));
        _expectInvalid(1, author, params, abi.encode(VP, signature));
        _expectInvalid(1, voter, abi.encode(vm.addr(ORACLE_KEY), bytes("other")), abi.encode(VP, signature));
        _expectInvalid(1, voter, params, abi.encode(VP + 1, signature));
        _expectInvalid(1, voter, abi.encode(author, PARAMS), abi.encode(VP, signature));
        _expectInvalid(1, voter, params, abi.encode(VP, ""));
    }

    function testGetVotingPowerOtherDomain() public {
        bytes memory params = abi.encode(vm.addr(ORACLE_KEY), PARAMS);
        address otherStrategy = address(new OracleVotingStrategy("snapshot-x", "1.0.0"));
        bytes memory signature = _sign(ORACLE_KEY, _digest(address(strategy), PARAMS, VP, 1, voter));

        _expectInvalid(
            1,
            voter,
            params,
            abi.encode(VP, _sign(ORACLE_KEY, _digest(otherStrategy, PARAMS, VP, 1, voter)))
        );
        vm.chainId(2);
        _expectInvalid(1, voter, params, abi.encode(VP, signature));
    }

    function testGetVotingPowerSafeInvalidSignatures() public {
        bytes memory params = abi.encode(safe, PARAMS);
        bytes32 digest = _digest(address(strategy), PARAMS, VP, 1, voter);

        // Below the threshold, with a non-owner, and over the Score digest instead of the SafeMessage
        _expectInvalid(1, voter, params, abi.encode(VP, _sign(1, _safeHash(digest))));
        _expectInvalid(1, voter, params, abi.encode(VP, _safeSign(1, 4, digest)));
        _expectInvalid(1, voter, params, abi.encode(VP, abi.encodePacked(_sign(1, digest), _sign(2, digest))));
    }

    function _deploySafe(string memory dir, string memory name) private returns (address) {
        return deployCode(string.concat(SAFE_ARTIFACTS, dir, name, ".sol/", name, ".json"));
    }

    function _expectInvalid(uint32 blockNumber, address user, bytes memory params, bytes memory userParams) private {
        vm.expectRevert(OracleVotingStrategy.InvalidSignature.selector);
        strategy.getVotingPower(blockNumber, user, params, userParams);
    }

    function _digest(
        address verifyingContract,
        bytes memory params,
        uint256 vp,
        uint32 blockNumber,
        address user
    ) private view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("snapshot-x"),
                keccak256("1.0.0"),
                block.chainid,
                verifyingContract
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Score(bytes params,uint256 votingPower,uint32 blockNumber,address voter)"),
                keccak256(params),
                vp,
                blockNumber,
                user
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function _safeHash(bytes32 digest) private view returns (bytes32) {
        return safeHandler.getMessageHashForSafe(safe, abi.encode(digest));
    }

    /// @dev Signs the SafeMessage of `digest` with both keys, sorted by signer address as Safe requires
    function _safeSign(uint256 keyA, uint256 keyB, bytes32 digest) private view returns (bytes memory) {
        if (vm.addr(keyA) > vm.addr(keyB)) (keyA, keyB) = (keyB, keyA);
        return abi.encodePacked(_sign(keyA, _safeHash(digest)), _sign(keyB, _safeHash(digest)));
    }

    function _sign(uint256 key, bytes32 hash) private pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, hash);
        return abi.encodePacked(r, s, v);
    }
}
