// This is combined ABI for all events in Governor including its extensions
export default [
  // IGovernor
  'event ProposalCanceled(uint256 proposalId)',
  'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)',
  'event ProposalExecuted(uint256 proposalId)',
  'event ProposalQueued(uint256 proposalId, uint256 etaSeconds)',
  'event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)',
  'event VoteCastWithParams(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason, bytes params)',
  // GovernorSettings
  'event ProposalThresholdSet(uint256 oldProposalThreshold, uint256 newProposalThreshold)',
  'event VotingDelaySet(uint256 oldVotingDelay, uint256 newVotingDelay)',
  'event VotingPeriodSet(uint256 oldVotingPeriod, uint256 newVotingPeriod)',
  // GovernorVotesQuorumFraction
  'event QuorumNumeratorUpdated(uint256 oldQuorumNumerator, uint256 newQuorumNumerator)',
  // GovernorTimelockControl
  'event TimelockChange(address oldTimelock, address newTimelock)'
];
