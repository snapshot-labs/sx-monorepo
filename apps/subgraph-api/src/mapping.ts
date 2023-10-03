import { Address, BigDecimal, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { ProxyDeployed } from '../generated/ProxyFactory/ProxyFactory'
import { AvatarExecutionStrategy } from '../generated/ProxyFactory/AvatarExecutionStrategy'
import { TimelockExecutionStrategy } from '../generated/ProxyFactory/TimelockExecutionStrategy'
import {
  SpaceCreated,
  ProposalCreated,
  ProposalUpdated,
  ProposalExecuted,
  ProposalCancelled,
  VoteCast,
  MetadataURIUpdated,
  VotingDelayUpdated,
  MinVotingDurationUpdated,
  MaxVotingDurationUpdated,
  OwnershipTransferred,
} from '../generated/templates/Space/Space'
import {
  ProposalExecuted as TimelockProposalExecuted,
  ProposalVetoed as TimelockProposalVetoed,
} from '../generated/templates/TimelockExecutionStrategy/TimelockExecutionStrategy'
import {
  Space as SpaceTemplate,
  TimelockExecutionStrategy as TimelockExecutionStrategyTemplate,
  SpaceMetadata as SpaceMetadataTemplate,
  ProposalMetadata as ProposalMetadataTemplate,
} from '../generated/templates'
import { Space, ExecutionStrategy, ExecutionHash, Proposal, Vote, User } from '../generated/schema'
import {
  decodeProposalValidationParams,
  getProposalValidationThreshold,
  getProposalValidationStrategies,
  getProposalValidationStrategiesParams,
  updateStrategiesParsedMetadata,
} from './helpers'

const MASTER_SPACE = Address.fromString('0xd9c46d5420434355d0E5Ca3e3cCb20cE7A533964')
const MASTER_SIMPLE_QUORUM_AVATAR = Address.fromString('0x3813f3d97Aa2F80e3aF625605A31206e067FB2e5')
const MASTER_SIMPLE_QUORUM_TIMELOCK = Address.fromString(
  '0x00C5E67e6F7FDf80d7bCA249E38C355FbE62Ba34'
)
const VOTING_POWER_VALIDATION_STRATEGY = Address.fromString(
  '0x6D9d6D08EF6b26348Bd18F1FC8D953696b7cf311'
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
    executionStrategy.timelock_delay = new BigInt(0)
    executionStrategy.save()
  } else if (event.params.implementation.equals(MASTER_SIMPLE_QUORUM_TIMELOCK)) {
    let executionStrategyContract = TimelockExecutionStrategy.bind(event.params.proxy)
    let typeResult = executionStrategyContract.try_getStrategyType()
    let quorumResult = executionStrategyContract.try_quorum()
    let timelockVetoGuardianResult = executionStrategyContract.try_vetoGuardian()
    let timelockDelayResult = executionStrategyContract.try_timelockDelay()
    if (
      typeResult.reverted ||
      quorumResult.reverted ||
      timelockVetoGuardianResult.reverted ||
      timelockDelayResult.reverted
    ) {
      return
    }

    let executionStrategy = new ExecutionStrategy(event.params.proxy.toHexString())
    executionStrategy.type = typeResult.value
    executionStrategy.quorum = new BigDecimal(quorumResult.value)
    executionStrategy.timelock_veto_guardian = timelockVetoGuardianResult.value
    executionStrategy.timelock_delay = timelockDelayResult.value
    executionStrategy.save()

    TimelockExecutionStrategyTemplate.create(event.params.proxy)
  }
}

export function handleSpaceCreated(event: SpaceCreated): void {
  let space = new Space(event.params.space.toHexString())
  space.controller = event.params.input.owner
  space.voting_delay = event.params.input.votingDelay.toI32()
  space.min_voting_period = event.params.input.minVotingDuration.toI32()
  space.max_voting_period = event.params.input.maxVotingDuration.toI32()
  space.quorum = new BigDecimal(new BigInt(0))
  space.strategies = event.params.input.votingStrategies.map<Bytes>((strategy) => strategy.addr)
  space.strategies_params = event.params.input.votingStrategies.map<string>((strategy) =>
    strategy.params.toHexString()
  )
  space.validation_strategy = event.params.input.proposalValidationStrategy.addr
  space.validation_strategy_params = event.params.input.proposalValidationStrategy.params.toHexString()

  if (space.validation_strategy.equals(VOTING_POWER_VALIDATION_STRATEGY)) {
    let params = decodeProposalValidationParams(
      event.params.input.proposalValidationStrategy.params
    )

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
      space.voting_power_validation_strategy_strategies_params = []
    }
  } else {
    space.proposal_threshold = new BigDecimal(new BigInt(0))
    space.voting_power_validation_strategy_strategies = []
    space.voting_power_validation_strategy_strategies_params = []
  }

  space.strategies_metadata = event.params.input.votingStrategyMetadataURIs
  space.authenticators = event.params.input.authenticators.map<Bytes>((address) => address)
  space.proposal_count = 0
  space.vote_count = 0
  space.created = event.block.timestamp.toI32()
  space.tx = event.transaction.hash

  if (event.params.input.metadataURI.startsWith('ipfs://')) {
    let hash = event.params.input.metadataURI.slice(7)
    space.metadata = hash
    SpaceMetadataTemplate.create(hash)
  }

  updateStrategiesParsedMetadata(space.id, space.strategies_metadata)

  space.save()
}

export function handleProposalCreated(event: ProposalCreated): void {
  let space = Space.load(event.address.toHexString())
  if (space == null) {
    return
  }

  let proposalId = `${space.id}/${event.params.proposalId}`
  let proposal = new Proposal(proposalId)
  proposal.proposal_id = event.params.proposalId.toI32()
  proposal.space = space.id
  proposal.author = event.params.author.toHexString()
  proposal.execution_hash = event.params.proposal.executionPayloadHash.toHexString()
  proposal.start = event.params.proposal.startBlockNumber.toI32()
  proposal.min_end = event.params.proposal.minEndBlockNumber.toI32()
  proposal.max_end = event.params.proposal.maxEndBlockNumber.toI32()
  proposal.snapshot = event.params.proposal.startBlockNumber.toI32()
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
  proposal.execution_time = 0
  proposal.executed = false
  proposal.vetoed = false
  proposal.completed = false
  proposal.cancelled = false

  let executionStrategy = ExecutionStrategy.load(
    event.params.proposal.executionStrategy.toHexString()
  )
  if (executionStrategy !== null) {
    proposal.quorum = executionStrategy.quorum
    proposal.timelock_veto_guardian = executionStrategy.timelock_veto_guardian
    proposal.timelock_delay = executionStrategy.timelock_delay
    proposal.execution_strategy_type = executionStrategy.type
  } else {
    proposal.quorum = new BigDecimal(new BigInt(0))
    proposal.timelock_veto_guardian = null
    proposal.timelock_delay = new BigInt(0)
    proposal.execution_strategy_type = 'none'
  }

  let executionHash = new ExecutionHash(proposal.execution_hash)
  executionHash.proposal_id = proposalId
  executionHash.save()

  let metadataUri = event.params.metadataUri
  if (metadataUri.startsWith('ipfs://')) {
    let hash = metadataUri.slice(7)
    proposal.metadata = hash
    ProposalMetadataTemplate.create(hash)
  }

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

  proposal.edited = event.block.timestamp.toI32()
  proposal.execution_strategy = event.params.newExecutionStrategy.addr
  proposal.execution_hash = event.params.newExecutionStrategy.params.toHexString()

  let executionStrategy = ExecutionStrategy.load(
    event.params.newExecutionStrategy.addr.toHexString()
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

  let metadataUri = event.params.newMetadataURI
  if (metadataUri.startsWith('ipfs://')) {
    let hash = metadataUri.slice(7)
    proposal.metadata = hash
    ProposalMetadataTemplate.create(hash)
  }

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

export function handleProposalCancelled(event: ProposalCancelled): void {
  let proposal = Proposal.load(`${event.address.toHexString()}/${event.params.proposalId}`)
  let space = Space.load(event.address.toHexString())

  if (space == null || proposal == null) {
    return
  }

  space.proposal_count -= 1
  space.vote_count -= proposal.vote_count
  space.save()

  proposal.cancelled = true
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

  let vote = new Vote(`${space.id}/${event.params.proposalId}/${event.params.voter.toHexString()}`)
  vote.voter = event.params.voter.toHexString()
  vote.space = space.id
  vote.proposal = event.params.proposalId.toI32()
  vote.choice = choice
  vote.vp = vp
  vote.created = event.block.timestamp.toI32()
  vote.tx = event.transaction.hash
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

  let user = User.load(event.params.voter.toHexString())
  if (user == null) {
    user = new User(event.params.voter.toHexString())
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

  if (event.params.newMetadataURI.startsWith('ipfs://')) {
    let hash = event.params.newMetadataURI.slice(7)
    space.metadata = hash
    SpaceMetadataTemplate.create(hash)
  }

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

export function handleTimelockProposalVetoed(event: TimelockProposalVetoed): void {
  let executionHash = ExecutionHash.load(event.params.executionPayloadHash.toHexString())
  if (executionHash === null) {
    return
  }

  let proposal = Proposal.load(executionHash.proposal_id)
  if (proposal === null) {
    return
  }

  proposal.completed = true
  proposal.vetoed = true
  proposal.veto_tx = event.transaction.hash
  proposal.save()
}
