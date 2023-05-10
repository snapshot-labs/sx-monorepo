import { Address, BigDecimal, BigInt, Bytes, ipfs, json, log } from '@graphprotocol/graph-ts'
import { JSON } from 'assemblyscript-json'
import { ProxyDeployed } from '../generated/ProxyFactory/ProxyFactory'
import { AvatarExecutionStrategy } from '../generated/ProxyFactory/AvatarExecutionStrategy'
import { TimelockExecutionStrategy } from '../generated/ProxyFactory/TimelockExecutionStrategy'
import {
  SpaceCreated,
  ProposalCreated,
  ProposalUpdated,
  ProposalExecuted,
  VoteCast,
  MetadataURIUpdated,
  VotingDelayUpdated,
  MinVotingDurationUpdated,
  MaxVotingDurationUpdated,
  OwnershipTransferred,
} from '../generated/templates/Space/Space'
import { ProposalExecuted as TimelockProposalExecuted } from '../generated/templates/TimelockExecutionStrategy/TimelockExecutionStrategy'
import {
  Space as SpaceTemplate,
  TimelockExecutionStrategy as TimelockExecutionStrategyTemplate,
} from '../generated/templates'
import { Space, ExecutionStrategy, ExecutionHash, Proposal, Vote, User } from '../generated/schema'
import {
  decodeProposalValidationParams,
  getProposalValidationThreshold,
  getProposalValidationStrategies,
  getProposalValidationStrategiesParams,
  updateSpaceMetadata,
  updateProposalMetadata,
  updateStrategiesParsedMetadata,
} from './helpers'

const MASTER_SPACE = Address.fromString('0xB5E5c8a9A999Da1AABb2b45DC9F72F2be042e204')
const MASTER_SIMPLE_QUORUM_AVATAR = Address.fromString('0x6F12C67cAd3e566B60A6AE0146761110F1Ea6Eb2')
const MASTER_SIMPLE_QUORUM_TIMELOCK = Address.fromString(
  '0x36b8D5bC9271060643200F11D8C9e90eCf0ee5A3'
)
const VOTING_POWER_VALIDATION_STRATEGY = Address.fromString(
  '0x03d512E0165d6B53ED2753Df2f3184fBd2b52E48'
)

export function handleProxyDeployed(event: ProxyDeployed): void {
  if (event.params.implementation.equals(MASTER_SPACE)) {
    SpaceTemplate.create(event.params.proxy)
  } else if (event.params.implementation.equals(MASTER_SIMPLE_QUORUM_AVATAR)) {
    let executionStrategyContract = AvatarExecutionStrategy.bind(event.params.proxy)
    let typeResult = executionStrategyContract.try_getStrategyType()
    let quorumResult = executionStrategyContract.try_quorum()
    if (typeResult.reverted || quorumResult.reverted) return

    let executionStrategy = new ExecutionStrategy(event.params.proxy.toHexString())
    executionStrategy.type = typeResult.value
    executionStrategy.quorum = new BigDecimal(quorumResult.value)
    executionStrategy.save()
  } else if (event.params.implementation.equals(MASTER_SIMPLE_QUORUM_TIMELOCK)) {
    let executionStrategyContract = TimelockExecutionStrategy.bind(event.params.proxy)
    let typeResult = executionStrategyContract.try_getStrategyType()
    let quorumResult = executionStrategyContract.try_quorum()
    let timelockDelayResult = executionStrategyContract.try_timelockDelay()
    if (typeResult.reverted || quorumResult.reverted || timelockDelayResult.reverted) return

    let executionStrategy = new ExecutionStrategy(event.params.proxy.toHexString())
    executionStrategy.type = typeResult.value
    executionStrategy.quorum = new BigDecimal(quorumResult.value)
    executionStrategy.timelock_delay = timelockDelayResult.value
    executionStrategy.save()

    TimelockExecutionStrategyTemplate.create(event.params.proxy)
  }
}

export function handleSpaceCreated(event: SpaceCreated): void {
  let space = new Space(event.params.space.toHexString())
  space.name = 'Fellow DAO ' + event.params.space.toHexString().slice(0, 6)
  space.about = ''
  space.controller = event.params.owner
  space.voting_delay = event.params.votingDelay.toI32()
  space.min_voting_period = event.params.minVotingDuration.toI32()
  space.max_voting_period = event.params.maxVotingDuration.toI32()
  space.quorum = new BigDecimal(new BigInt(0))
  space.strategies = event.params.votingStrategies.map<Bytes>((strategy) => strategy.addy)
  space.strategies_params = event.params.votingStrategies.map<string>((strategy) =>
    strategy.params.toHexString()
  )
  space.validation_strategy = event.params.proposalValidationStrategy.addy
  space.validation_strategy_params = event.params.proposalValidationStrategy.params.toHexString()

  if (space.validation_strategy.equals(VOTING_POWER_VALIDATION_STRATEGY)) {
    let params = decodeProposalValidationParams(event.params.proposalValidationStrategy.params)

    if (params) {
      space.proposal_threshold = new BigDecimal(getProposalValidationThreshold(params))
      space.voting_power_validation_strategy_strategies = getProposalValidationStrategies(
        params
      ).map<Bytes>((strategy) => strategy)
      space.voting_power_validation_strategy_strategies_params = getProposalValidationStrategiesParams(
        params
      ).map<string>((params) => params.toHexString())
    } else {
      space.proposal_threshold = new BigDecimal(new BigInt(0))
      space.voting_power_validation_strategy_strategies = []
    }
  }

  space.strategies_metadata = event.params.votingStrategyMetadataURIs
  space.authenticators = event.params.authenticators.map<Bytes>((address) => address)
  space.proposal_count = 0
  space.vote_count = 0
  space.created = event.block.timestamp.toI32()
  space.tx = event.transaction.hash

  updateSpaceMetadata(space, event.params.metadataURI)
  updateStrategiesParsedMetadata(space.id, space.strategies_metadata)

  space.save()
}

export function handleProposalCreated(event: ProposalCreated): void {
  let space = Space.load(event.address.toHexString())
  if (space == null) {
    return
  }

  let metadataUri = event.params.metadataUri

  let proposalId = `${space.id}/${event.params.nextProposalId}`
  let proposal = new Proposal(proposalId)
  proposal.proposal_id = event.params.nextProposalId.toI32()
  proposal.space = space.id
  proposal.author = event.params.author.toHexString()
  proposal.execution_hash = event.params.proposal.executionPayloadHash.toHexString()
  proposal.metadata_uri = metadataUri
  proposal.title = ''
  proposal.body = ''
  proposal.discussion = ''
  proposal.execution = ''
  proposal.start = event.params.proposal.startTimestamp.toI32()
  proposal.min_end = event.params.proposal.minEndTimestamp.toI32()
  proposal.max_end = event.params.proposal.maxEndTimestamp.toI32()
  proposal.snapshot = event.params.proposal.snapshotTimestamp.toI32()
  proposal.strategies = space.strategies
  proposal.strategies_params = space.strategies_params
  proposal.scores_1 = BigDecimal.fromString('0')
  proposal.scores_2 = BigDecimal.fromString('0')
  proposal.scores_3 = BigDecimal.fromString('0')
  proposal.scores_total = BigDecimal.fromString('0')
  proposal.created = event.block.timestamp.toI32()
  proposal.tx = event.transaction.hash
  proposal.vote_count = 0
  proposal.execution_strategy = event.params.proposal.executionStrategy

  let executionStrategy = ExecutionStrategy.load(
    event.params.proposal.executionStrategy.toHexString()
  )
  if (executionStrategy !== null) {
    proposal.quorum = executionStrategy.quorum
    proposal.timelock_delay = executionStrategy.timelock_delay
    proposal.execution_strategy_type = executionStrategy.type
  } else {
    proposal.quorum = new BigDecimal(new BigInt(0))
    proposal.timelock_delay = new BigInt(0)
    proposal.execution_strategy_type = 'none'
  }

  let executionHash = new ExecutionHash(proposal.execution_hash)
  executionHash.proposal_id = proposalId
  executionHash.save()

  updateProposalMetadata(proposal, metadataUri)

  proposal.save()

  space.proposal_count += 1
  space.save()

  let user = User.load(event.params.author.toHexString())
  if (user == null) {
    user = new User(event.params.author.toHexString())
    user.proposal_count = 0
    user.vote_count = 0
    user.created = event.block.timestamp.toI32()
    user.save()
  }
  user.proposal_count += 1
  user.save()
}

export function handleProposalUpdated(event: ProposalUpdated): void {
  let proposalId = `${event.address.toHexString()}/${event.params.proposalId}`

  let proposal = Proposal.load(proposalId)
  if (proposal == null) {
    return
  }

  proposal.execution_strategy = event.params.newExecutionStrategy.addy
  proposal.execution_hash = event.params.newExecutionStrategy.params.toHexString()

  let executionStrategy = ExecutionStrategy.load(
    event.params.newExecutionStrategy.addy.toHexString()
  )
  if (executionStrategy !== null) {
    proposal.quorum = executionStrategy.quorum
    proposal.timelock_delay = executionStrategy.timelock_delay
    proposal.execution_strategy_type = executionStrategy.type
  } else {
    proposal.quorum = new BigDecimal(new BigInt(0))
    proposal.timelock_delay = new BigInt(0)
    proposal.execution_strategy_type = 'none'
  }

  let executionHash = new ExecutionHash(proposal.execution_hash)
  executionHash.proposal_id = proposalId
  executionHash.save()

  updateProposalMetadata(proposal, event.params.newMetadataURI)

  proposal.save()
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposal = Proposal.load(`${event.address.toHexString()}/${event.params.proposalId}`)
  if (proposal == null) {
    return
  }

  proposal.executed = true

  let executionStrategy = ExecutionStrategy.load(proposal.execution_strategy.toHexString())

  if (executionStrategy !== null) {
    if (
      executionStrategy.type == 'SimpleQuorumVanilla' ||
      executionStrategy.type == 'SimpleQuorumAvatar'
    ) {
      proposal.completed = true
      proposal.execution_tx = event.transaction.hash
    }

    if (executionStrategy.type == 'SimpleQuorumTimelock') {
      proposal.execution_time =
        event.block.timestamp.toI32() + executionStrategy.timelock_delay.toI32()
    }
  }

  proposal.save()
}

export function handleVoteCreated(event: VoteCast): void {
  let space = Space.load(event.address.toHexString())
  if (space == null) {
    return
  }

  // Swap For/Against
  let choice = event.params.choice
  if (event.params.choice === 0) choice = 2
  if (event.params.choice === 1) choice = 1
  if (event.params.choice === 2) choice = 3

  let vp = event.params.votingPower.toBigDecimal()

  let vote = new Vote(
    `${space.id}/${event.params.proposalId}/${event.params.voterAddress.toHexString()}`
  )
  vote.voter = event.params.voterAddress.toHexString()
  vote.space = space.id
  vote.proposal = event.params.proposalId.toI32()
  vote.choice = choice
  vote.vp = vp
  vote.created = event.block.timestamp.toI32()
  vote.save()

  space.vote_count += 1
  space.save()

  let proposal = Proposal.load(`${space.id}/${event.params.proposalId}`)
  if (proposal !== null) {
    proposal.setBigDecimal(
      `scores_${choice.toString()}`,
      proposal.getBigDecimal(`scores_${choice.toString()}`).plus(vp)
    )
    proposal.scores_total = proposal.scores_total.plus(vp)
    proposal.vote_count += 1
    proposal.save()
  }

  let user = User.load(event.params.voterAddress.toHexString())
  if (user == null) {
    user = new User(event.params.voterAddress.toHexString())
    user.proposal_count = 0
    user.vote_count = 0
    user.created = event.block.timestamp.toI32()
    user.save()
  }
  user.vote_count += 1
  user.save()
}

export function handleMetadataUriUpdated(event: MetadataURIUpdated): void {
  let space = Space.load(event.address.toHexString())
  if (space == null) {
    return
  }

  updateSpaceMetadata(space, event.params.newMetadataURI)

  space.save()
}

export function handleVotingDelayUpdated(event: VotingDelayUpdated): void {
  let space = Space.load(event.address.toHexString())
  if (space == null) {
    return
  }

  space.voting_delay = event.params.newVotingDelay.toI32()
  space.save()
}

export function handleMinVotingDurationUpdated(event: MinVotingDurationUpdated): void {
  let space = Space.load(event.address.toHexString())
  if (space == null) {
    return
  }

  space.min_voting_period = event.params.newMinVotingDuration.toI32()
  space.save()
}

export function handleMaxVotingDurationUpdated(event: MaxVotingDurationUpdated): void {
  let space = Space.load(event.address.toHexString())
  if (space == null) {
    return
  }

  space.max_voting_period = event.params.newMaxVotingDuration.toI32()
  space.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let space = Space.load(event.address.toHexString())
  if (space == null) {
    return
  }

  space.controller = event.params.newOwner
  space.save()
}

export function handleTimelockProposalExecuted(event: TimelockProposalExecuted): void {
  let executionHash = ExecutionHash.load(event.params.executionPayloadHash.toHexString())
  if (executionHash === null) {
    return
  }

  let proposal = Proposal.load(executionHash.proposal_id)
  if (proposal === null) {
    return
  }

  proposal.completed = true
  proposal.execution_tx = event.transaction.hash
  proposal.save()
}
