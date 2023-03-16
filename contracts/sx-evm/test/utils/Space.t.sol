// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import { Test } from "forge-std/Test.sol";
import { GasSnapshot } from "forge-gas-snapshot/GasSnapshot.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import { Space } from "../../src/Space.sol";
import { VanillaAuthenticator } from "../../src/authenticators/VanillaAuthenticator.sol";
import { VanillaVotingStrategy } from "../../src/voting-strategies/VanillaVotingStrategy.sol";
import { VanillaExecutionStrategy } from "../../src/execution-strategies/VanillaExecutionStrategy.sol";
import {
    VotingPowerProposalValidationStrategy
} from "../../src/proposal-validation-strategies/VotingPowerProposalValidationStrategy.sol";
import { ISpaceEvents } from "../../src/interfaces/space/ISpaceEvents.sol";
import { ISpaceErrors } from "../../src/interfaces/space/ISpaceErrors.sol";
import { IExecutionStrategyErrors } from "../../src/interfaces/execution-strategies/IExecutionStrategyErrors.sol";
import { Choice, Strategy, IndexedStrategy } from "../../src/types.sol";

// solhint-disable-next-line max-states-count
abstract contract SpaceTest is Test, GasSnapshot, ISpaceEvents, ISpaceErrors, IExecutionStrategyErrors {
    bytes4 internal constant PROPOSE_SELECTOR = bytes4(keccak256("propose(address,string,(uint8,bytes),bytes)"));
    bytes4 internal constant VOTE_SELECTOR = bytes4(keccak256("vote(address,uint256,uint8,(uint8,bytes)[],string)"));
    bytes4 internal constant UPDATE_PROPOSAL_SELECTOR =
        bytes4(keccak256("updateProposal(address,uint256,(uint8,bytes),string)"));

    Space internal masterSpace;
    Space internal space;
    VanillaVotingStrategy internal vanillaVotingStrategy;
    VanillaAuthenticator internal vanillaAuthenticator;
    VanillaExecutionStrategy internal vanillaExecutionStrategy;
    VotingPowerProposalValidationStrategy internal votingPowerProposalValidationContract;

    uint256 public constant AUTHOR_KEY = 1234;
    uint256 public constant VOTER_KEY = 5678;
    uint256 public constant UNAUTHORIZED_KEY = 4321;

    string internal voteMetadataURI = "Hi";

    // Address of the meta transaction relayer (mana)
    address public relayer = address(this);
    address public owner = address(this);
    address public author = vm.addr(AUTHOR_KEY);
    address public voter = vm.addr(VOTER_KEY);
    address public unauthorized = vm.addr(UNAUTHORIZED_KEY);

    // Initial whitelisted modules set in the space
    Strategy[] internal votingStrategies;
    address[] internal authenticators;
    Strategy[] internal executionStrategies;

    // Initial space parameters
    uint32 public votingDelay;
    uint32 public minVotingDuration;
    uint32 public maxVotingDuration;
    uint256 public proposalThreshold;
    uint32 public quorum;
    Strategy public votingPowerProposalValidationStrategy;

    // Default voting and execution strategy setups
    IndexedStrategy[] public userVotingStrategies;
    IndexedStrategy public executionStrategy;

    // Dummy metadata URIs
    string public spaceMetadataURI = "SOC Test Space";
    string public proposalMetadataURI = "SOC Test Proposal";
    string[] public votingStrategyMetadataURIs;
    string[] public executionStrategyMetadataURIs;

    function setUp() public virtual {
        masterSpace = new Space();

        vanillaVotingStrategy = new VanillaVotingStrategy();
        vanillaAuthenticator = new VanillaAuthenticator();
        vanillaExecutionStrategy = new VanillaExecutionStrategy();
        votingPowerProposalValidationContract = new VotingPowerProposalValidationStrategy();

        votingDelay = 0;
        minVotingDuration = 0;
        maxVotingDuration = 1000;
        proposalThreshold = 1;
        quorum = 1;
        votingStrategies.push(Strategy(address(vanillaVotingStrategy), new bytes(0)));
        authenticators.push(address(vanillaAuthenticator));
        executionStrategies.push(Strategy(address(vanillaExecutionStrategy), abi.encode(uint256(quorum))));
        userVotingStrategies.push(IndexedStrategy(0, new bytes(0)));
        executionStrategy = IndexedStrategy(0, new bytes(0));
        votingPowerProposalValidationStrategy = Strategy(
            address(votingPowerProposalValidationContract),
            abi.encode(proposalThreshold, votingStrategies)
        );
        space = Space(
            address(
                new ERC1967Proxy(
                    address(masterSpace),
                    abi.encodeWithSelector(
                        Space.initialize.selector,
                        owner,
                        votingDelay,
                        minVotingDuration,
                        maxVotingDuration,
                        votingPowerProposalValidationStrategy,
                        spaceMetadataURI,
                        votingStrategies,
                        votingStrategyMetadataURIs,
                        authenticators,
                        executionStrategies,
                        executionStrategyMetadataURIs
                    )
                )
            )
        );
    }

    function _createProposal(
        address _author,
        string memory _metadataURI,
        IndexedStrategy memory _executionStrategy,
        IndexedStrategy[] memory _userVotingStrategies
    ) internal returns (uint256) {
        vanillaAuthenticator.authenticate(
            address(space),
            PROPOSE_SELECTOR,
            abi.encode(_author, _metadataURI, _executionStrategy, abi.encode(_userVotingStrategies))
        );

        return space.nextProposalId() - 1;
    }

    function _vote(
        address _author,
        uint256 _proposalId,
        Choice _choice,
        IndexedStrategy[] memory _userVotingStrategies,
        string memory _voteMetadataURI
    ) internal {
        vanillaAuthenticator.authenticate(
            address(space),
            VOTE_SELECTOR,
            abi.encode(_author, _proposalId, _choice, _userVotingStrategies, _voteMetadataURI)
        );
    }
}
