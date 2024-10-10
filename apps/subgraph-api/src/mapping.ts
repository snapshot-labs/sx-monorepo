import { Address, BigDecimal, BigInt, Bytes, dataSource, ethereum } from '@graphprotocol/graph-ts'
import { ProxyDeployed } from '../generated/ProxyFactory/ProxyFactory'
import { AvatarExecutionStrategy } from '../generated/ProxyFactory/AvatarExecutionStrategy'
import {
  AxiomExecutionStrategy,
  WriteOffchainVotes,
} from '../generated/ProxyFactory/AxiomExecutionStrategy'
import { TimelockExecutionStrategy } from '../generated/ProxyFactory/TimelockExecutionStrategy'
import {
  SpaceCreated,
  ProposalCreated,
  ProposalUpdated,
  ProposalExecuted,
  ProposalCancelled,
  VoteCast,
  VoteCastWithMetadata,
  MetadataURIUpdated,
  VotingDelayUpdated,
  MinVotingDurationUpdated,
  MaxVotingDurationUpdated,
  OwnershipTransferred,
  AuthenticatorsAdded,
  AuthenticatorsRemoved,
  VotingStrategiesAdded,
  VotingStrategiesRemoved,
  ProposalValidationStrategyUpdated,
} from '../generated/templates/Space/Space'
import {
  ProposalExecuted as TimelockProposalExecuted,
  ProposalVetoed as TimelockProposalVetoed,
} from '../generated/templates/TimelockExecutionStrategy/TimelockExecutionStrategy'
import {
  Space as SpaceTemplate,
  AxiomExecutionStrategy as AxiomExecutionStrategyTemplate,
  TimelockExecutionStrategy as TimelockExecutionStrategyTemplate,
  SpaceMetadata as SpaceMetadataTemplate,
  ProposalMetadata as ProposalMetadataTemplate,
  VoteMetadata as VoteMetadataTemplate,
} from '../generated/templates'
import {
  Space,
  ExecutionStrategy,
  ExecutionHash,
  Proposal,
  Vote,
  User,
  Leaderboard,
} from '../generated/schema'
import {
  updateStrategiesParsedMetadata,
  updateProposalValidationStrategy,
  toChecksumAddress,
} from './helpers'

const MASTER_SPACE = Address.fromString('0xC3031A7d3326E47D49BfF9D374d74f364B29CE4D')
const MASTER_SIMPLE_QUORUM_AVATAR = Address.fromString('0xecE4f6b01a2d7FF5A9765cA44162D453fC455e42')
const MASTER_AXIOM = Address.fromString('0xaC6dbd42Ed254E9407fe0D2798784d0110979DC2')
const MASTER_SIMPLE_QUORUM_TIMELOCK = Address.fromString(
  '0xf2A1C2f2098161af98b2Cc7E382AB7F3ba86Ebc4'
)

const CHAIN_IDS = new Map<string, i32>()
CHAIN_IDS.set('mainnet', 1)
CHAIN_IDS.set('sepolia', 11155111)
CHAIN_IDS.set('optimism', 10)
CHAIN_IDS.set('matic', 137)
CHAIN_IDS.set('arbitrum-one', 42161)
CHAIN_IDS.set('linea-testnet', 59140)

export function handleProxyDeployed(event: ProxyDeployed): void {
  let network = dataSource.network()

  if (event.params.implementation.equals(MASTER_SPACE)) {
    SpaceTemplate.create(event.params.proxy)
  } else if (event.params.implementation.equals(MASTER_SIMPLE_QUORUM_AVATAR)) {
    let executionStrategyContract = AvatarExecutionStrategy.bind(event.params.proxy)
    let typeResult = executionStrategyContract.try_getStrategyType()
    let quorumResult = executionStrategyContract.try_quorum()
    let targetAddress = executionStrategyContract.try_target()
    if (typeResult.reverted || quorumResult.reverted || targetAddress.reverted) return

    let address = toChecksumAddress(event.params.proxy.toHexString())
    let executionStrategy = new ExecutionStrategy(address)
    executionStrategy.address = address
    executionStrategy.type = typeResult.value
    executionStrategy.quorum = new BigDecimal(quorumResult.value)
    if (CHAIN_IDS.has(network)) executionStrategy.treasury_chain = CHAIN_IDS.get(network)
    executionStrategy.treasury = toChecksumAddress(targetAddress.value.toHexString())
    executionStrategy.timelock_delay = new BigInt(0)
    executionStrategy.save()
  } else if (event.params.implementation.equals(MASTER_AXIOM)) {
    let executionStrategyContract = AxiomExecutionStrategy.bind(event.params.proxy)
    let typeResult = executionStrategyContract.try_getStrategyType()
    let quorumResult = executionStrategyContract.try_quorum()
    let snapshotAddressResult = executionStrategyContract.try_snapshotAddress()
    let snapshotSlotResult = executionStrategyContract.try_snapshotSlot()
    if (
      typeResult.reverted ||
      quorumResult.reverted ||
      snapshotAddressResult.reverted ||
      snapshotSlotResult.reverted
    ) {
      return
    }

    let address = toChecksumAddress(event.params.proxy.toHexString())
    let executionStrategy = new ExecutionStrategy(address)
    executionStrategy.address = address
    executionStrategy.type = 'Axiom' // override because contract returns AxiomExecutionStrategyMock
    executionStrategy.quorum = new BigDecimal(quorumResult.value)
    if (CHAIN_IDS.has(network)) executionStrategy.treasury_chain = CHAIN_IDS.get(network)
    executionStrategy.treasury = toChecksumAddress(event.params.proxy.toHexString())
    executionStrategy.timelock_delay = new BigInt(0)
    executionStrategy.axiom_snapshot_address = toChecksumAddress(
      snapshotAddressResult.value.toHexString()
    )
    executionStrategy.axiom_snapshot_slot = snapshotSlotResult.value
    executionStrategy.save()

    AxiomExecutionStrategyTemplate.create(event.params.proxy)
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

    let address = toChecksumAddress(event.params.proxy.toHexString())
    let executionStrategy = new ExecutionStrategy(address)
    executionStrategy.address = address
    executionStrategy.type = typeResult.value
    executionStrategy.quorum = new BigDecimal(quorumResult.value)
    if (CHAIN_IDS.has(network)) executionStrategy.treasury_chain = CHAIN_IDS.get(network)
    executionStrategy.treasury = toChecksumAddress(event.params.proxy.toHexString())
    executionStrategy.timelock_veto_guardian = toChecksumAddress(
      timelockVetoGuardianResult.value.toHexString()
    )
    executionStrategy.timelock_delay = timelockDelayResult.value
    executionStrategy.save()

    TimelockExecutionStrategyTemplate.create(event.params.proxy)
  }
}

export function handleSpaceCreated(event: SpaceCreated): void {
  let space = new Space(toChecksumAddress(event.params.space.toHexString()))
  space.verified = false
  space.turbo = false
  space.controller = toChecksumAddress(event.params.input.owner.toHexString())
  space.voting_delay = event.params.input.votingDelay.toI32()
  space.min_voting_period = event.params.input.minVotingDuration.toI32()
  space.max_voting_period = event.params.input.maxVotingDuration.toI32()
  space.quorum = new BigDecimal(new BigInt(0))
  space.strategies_indices = event.params.input.votingStrategies.map<i32>((_, i) => i32(i))
  space.next_strategy_index = event.params.input.votingStrategies.length
  space.strategies = event.params.input.votingStrategies.map<string>((strategy) =>
    toChecksumAddress(strategy.addr.toHexString())
  )
  space.strategies_params = event.params.input.votingStrategies.map<string>((strategy) =>
    strategy.params.toHexString()
  )

  updateProposalValidationStrategy(
    space,
    event.params.input.proposalValidationStrategy.addr,
    event.params.input.proposalValidationStrategy.params,
    event.params.input.proposalValidationStrategyMetadataURI,
    event.block.number
  )

  space.strategies_metadata = event.params.input.votingStrategyMetadataURIs
  space.authenticators = event.params.input.authenticators.map<string>((address) =>
    toChecksumAddress(address.toHexString())
  )
  space.proposal_count = 0
  space.vote_count = 0
  space.proposer_count = 0
  space.voter_count = 0
  space.created = event.block.timestamp.toI32()
  space.tx = event.transaction.hash

  if (event.params.input.metadataURI.startsWith('ipfs://')) {
    let hash = event.params.input.metadataURI.slice(7)
    space.metadata = hash
    SpaceMetadataTemplate.create(hash)
  }

  updateStrategiesParsedMetadata(
    space.id,
    space.strategies_metadata,
    0,
    event.block.number,
    'StrategiesParsedMetadata'
  )

  space.save()
}

export function handleProposalCreated(event: ProposalCreated): void {
  let space = Space.load(toChecksumAddress(event.address.toHexString()))
  if (space == null) {
    return
  }

  let proposalId = `${space.id}/${event.params.proposalId}`
  let proposal = new Proposal(proposalId)
  proposal.proposal_id = event.params.proposalId.toI32()
  proposal.space = space.id
  proposal.author = toChecksumAddress(event.params.author.toHexString())
  proposal.execution_hash = event.params.proposal.executionPayloadHash.toHexString()
  proposal.start = event.params.proposal.startBlockNumber.toI32()
  proposal.min_end = event.params.proposal.minEndBlockNumber.toI32()
  proposal.max_end = event.params.proposal.maxEndBlockNumber.toI32()
  proposal.snapshot = event.params.proposal.startBlockNumber.toI32()
  proposal.strategies_indices = space.strategies_indices
  proposal.strategies = space.strategies
  proposal.strategies_params = space.strategies_params
  proposal.scores_1 = BigDecimal.fromString('0')
  proposal.scores_2 = BigDecimal.fromString('0')
  proposal.scores_3 = BigDecimal.fromString('0')
  proposal.scores_total = BigDecimal.fromString('0')
  proposal.created = event.block.timestamp.toI32()
  proposal.tx = event.transaction.hash
  proposal.vote_count = 0
  proposal.execution_strategy = toChecksumAddress(
    event.params.proposal.executionStrategy.toHexString()
  )
  proposal.execution_time = 0
  proposal.executed = false
  proposal.vetoed = false
  proposal.completed = false
  proposal.cancelled = false

  let executionStrategy = ExecutionStrategy.load(
    toChecksumAddress(event.params.proposal.executionStrategy.toHexString())
  )
  if (executionStrategy !== null) {
    proposal.quorum = executionStrategy.quorum
    proposal.timelock_veto_guardian = executionStrategy.timelock_veto_guardian
    proposal.timelock_delay = executionStrategy.timelock_delay
    proposal.axiom_snapshot_address = executionStrategy.axiom_snapshot_address
    proposal.axiom_snapshot_slot = executionStrategy.axiom_snapshot_slot
    proposal.execution_strategy_type = executionStrategy.type
  } else {
    proposal.quorum = new BigDecimal(new BigInt(0))
    proposal.timelock_veto_guardian = null
    proposal.timelock_delay = new BigInt(0)
    proposal.execution_strategy_type = 'none'
  }

  proposal.execution_ready = proposal.execution_strategy_type != 'Axiom'

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

  let userAddress = toChecksumAddress(event.params.author.toHexString())
  let user = User.load(userAddress)
  if (user == null) {
    user = new User(userAddress)
    user.address_type = 1
    user.proposal_count = 0
    user.vote_count = 0
    user.created = event.block.timestamp.toI32()
  }
  user.proposal_count += 1
  user.save()

  let leaderboardItem = Leaderboard.load(`${space.id}/${user.id}`)
  if (!leaderboardItem) {
    leaderboardItem = new Leaderboard(`${space.id}/${user.id}`)
    leaderboardItem.space = space.id
    leaderboardItem.user = user.id
    leaderboardItem.proposal_count = 0
    leaderboardItem.vote_count = 0
  }

  leaderboardItem.proposal_count += 1
  leaderboardItem.save()

  if (leaderboardItem.proposal_count === 1) space.proposer_count += 1
  space.proposal_count += 1
  space.save()
}

export function handleProposalUpdated(event: ProposalUpdated): void {
  let proposalId = `${toChecksumAddress(event.address.toHexString())}/${event.params.proposalId}`

  let proposal = Proposal.load(proposalId)
  if (proposal == null) {
    return
  }

  proposal.edited = event.block.timestamp.toI32()
  proposal.execution_strategy = toChecksumAddress(
    event.params.newExecutionStrategy.addr.toHexString()
  )
  proposal.execution_hash = event.params.newExecutionStrategy.params.toHexString()

  let executionStrategy = ExecutionStrategy.load(
    toChecksumAddress(event.params.newExecutionStrategy.addr.toHexString())
  )
  if (executionStrategy !== null) {
    proposal.quorum = executionStrategy.quorum
    proposal.timelock_delay = executionStrategy.timelock_delay
    proposal.axiom_snapshot_address = executionStrategy.axiom_snapshot_address
    proposal.axiom_snapshot_slot = executionStrategy.axiom_snapshot_slot
    proposal.execution_strategy_type = executionStrategy.type
  } else {
    proposal.quorum = new BigDecimal(new BigInt(0))
    proposal.timelock_delay = new BigInt(0)
    proposal.execution_strategy_type = 'none'
  }

  proposal.execution_ready = proposal.execution_strategy_type != 'Axiom'

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
  let proposal = Proposal.load(
    `${toChecksumAddress(event.address.toHexString())}/${event.params.proposalId}`
  )
  if (proposal == null) {
    return
  }

  proposal.executed = true

  let executionStrategy = ExecutionStrategy.load(proposal.execution_strategy)

  if (executionStrategy !== null) {
    if (
      executionStrategy.type == 'SimpleQuorumVanilla' ||
      executionStrategy.type == 'SimpleQuorumAvatar' ||
      executionStrategy.type == 'Axiom'
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
  let spaceId = toChecksumAddress(event.address.toHexString())
  let proposal = Proposal.load(`${spaceId}/${event.params.proposalId}`)
  let space = Space.load(spaceId)

  if (space == null || proposal == null) {
    return
  }

  space.proposal_count -= 1
  space.vote_count -= proposal.vote_count
  space.save()

  proposal.cancelled = true
  proposal.save()
}

export function _handleVoteCreated(
  event: ethereum.Event,
  proposalId: BigInt,
  choice: i32,
  voter: Address,
  votingPower: BigInt,
  metadataUri: string | null
): void {
  let space = Space.load(toChecksumAddress(event.address.toHexString()))
  if (space == null) {
    return
  }

  // Swap For/Against
  choice = choice
  if (choice === 0) choice = 2
  if (choice === 1) choice = 1
  if (choice === 2) choice = 3

  let vp = votingPower.toBigDecimal()

  let voterAddress = toChecksumAddress(voter.toHexString())
  let vote = new Vote(`${space.id}/${proposalId}/${voterAddress}`)
  vote.voter = voterAddress
  vote.space = space.id
  vote.proposal = proposalId.toI32()
  vote.choice = choice
  vote.vp = vp
  vote.created = event.block.timestamp.toI32()
  vote.tx = event.transaction.hash

  if (metadataUri !== null && metadataUri.startsWith('ipfs://')) {
    let hash = metadataUri.slice(7)
    vote.metadata = hash
    VoteMetadataTemplate.create(hash)
  }

  vote.save()

  let proposal = Proposal.load(`${space.id}/${proposalId}`)
  if (proposal !== null) {
    proposal.setBigDecimal(
      `scores_${choice.toString()}`,
      proposal.getBigDecimal(`scores_${choice.toString()}`).plus(vp)
    )
    proposal.scores_total = proposal.scores_total.plus(vp)
    proposal.vote_count += 1
    proposal.save()
  }

  let user = User.load(voterAddress)
  if (user == null) {
    user = new User(voterAddress)
    user.address_type = 1
    user.proposal_count = 0
    user.vote_count = 0
    user.created = event.block.timestamp.toI32()
  }

  user.vote_count += 1
  user.save()

  let leaderboardItem = Leaderboard.load(`${space.id}/${vote.voter}`)
  if (!leaderboardItem) {
    leaderboardItem = new Leaderboard(`${space.id}/${vote.voter}`)
    leaderboardItem.space = space.id
    leaderboardItem.user = vote.voter
    leaderboardItem.proposal_count = 0
    leaderboardItem.vote_count = 0
  }

  leaderboardItem.vote_count += 1
  leaderboardItem.save()

  if (leaderboardItem.vote_count === 1) space.voter_count += 1
  space.vote_count += 1
  space.save()
}

export function handleVoteCreated(event: VoteCast): void {
  _handleVoteCreated(
    event,
    event.params.proposalId,
    event.params.choice,
    event.params.voter,
    event.params.votingPower,
    null
  )
}

export function handleVoteCreatedWithMetadata(event: VoteCastWithMetadata): void {
  _handleVoteCreated(
    event,
    event.params.proposalId,
    event.params.choice,
    event.params.voter,
    event.params.votingPower,
    event.params.metadataUri
  )
}

export function handleMetadataUriUpdated(event: MetadataURIUpdated): void {
  let space = Space.load(toChecksumAddress(event.address.toHexString()))
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
  let space = Space.load(toChecksumAddress(event.address.toHexString()))
  if (space == null) {
    return
  }

  space.voting_delay = event.params.newVotingDelay.toI32()
  space.save()
}

export function handleMinVotingDurationUpdated(event: MinVotingDurationUpdated): void {
  let space = Space.load(toChecksumAddress(event.address.toHexString()))
  if (space == null) {
    return
  }

  space.min_voting_period = event.params.newMinVotingDuration.toI32()
  space.save()
}

export function handleMaxVotingDurationUpdated(event: MaxVotingDurationUpdated): void {
  let space = Space.load(toChecksumAddress(event.address.toHexString()))
  if (space == null) {
    return
  }

  space.max_voting_period = event.params.newMaxVotingDuration.toI32()
  space.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let space = Space.load(toChecksumAddress(event.address.toHexString()))
  if (space == null) {
    return
  }

  space.controller = toChecksumAddress(event.params.newOwner.toHexString())
  space.save()
}

export function handleAuthenticatorsAdded(event: AuthenticatorsAdded): void {
  let space = Space.load(toChecksumAddress(event.address.toHexString()))
  if (space == null) {
    return
  }

  let newAuthenticators = space.authenticators
  for (let i = 0; i < event.params.newAuthenticators.length; i++) {
    const authenticator = toChecksumAddress(event.params.newAuthenticators[i].toHexString())

    if (!newAuthenticators.includes(authenticator)) {
      newAuthenticators.push(authenticator)
    }
  }

  space.authenticators = newAuthenticators
  space.save()
}

export function handleAuthenticatorsRemoved(event: AuthenticatorsRemoved): void {
  let space = Space.load(toChecksumAddress(event.address.toHexString()))
  if (space == null) {
    return
  }

  let newAuthenticators = space.authenticators
  for (let i = 0; i < event.params.authenticators.length; i++) {
    const authenticator = toChecksumAddress(event.params.authenticators[i].toHexString())

    if (newAuthenticators.includes(authenticator)) {
      newAuthenticators.splice(newAuthenticators.indexOf(authenticator), 1)
    }
  }

  space.authenticators = newAuthenticators
  space.save()
}

export function handleVotingStrategiesAdded(event: VotingStrategiesAdded): void {
  let space = Space.load(toChecksumAddress(event.address.toHexString()))
  if (space == null) {
    return
  }

  let initialNextStrategy = space.next_strategy_index

  let strategies = event.params.newVotingStrategies.map<string>((strategy) =>
    toChecksumAddress(strategy.addr.toHexString())
  )
  let strategiesParams = event.params.newVotingStrategies.map<string>((strategy) =>
    strategy.params.toHexString()
  )
  let strategiesMetadataUris = event.params.newVotingStrategyMetadataURIs

  let newIndicies = [] as i32[]
  for (let i = 0; i < strategies.length; i++) {
    newIndicies.push(i32(initialNextStrategy + i))
  }

  let newStrategies = space.strategies
  for (let i = 0; i < strategies.length; i++) {
    newStrategies.push(strategies[i])
  }

  let newStrategiesParams = space.strategies_params
  for (let i = 0; i < strategiesParams.length; i++) {
    newStrategiesParams.push(strategiesParams[i])
  }

  let newStrategiesMetadata = space.strategies_metadata
  for (let i = 0; i < strategiesMetadataUris.length; i++) {
    newStrategiesMetadata.push(strategiesMetadataUris[i])
  }

  space.next_strategy_index += strategies.length
  space.strategies_indices = space.strategies_indices.concat(newIndicies)
  space.strategies = newStrategies
  space.strategies_params = newStrategiesParams
  space.strategies_metadata = newStrategiesMetadata

  updateStrategiesParsedMetadata(
    space.id,
    strategiesMetadataUris,
    initialNextStrategy,
    event.block.number,
    'StrategiesParsedMetadata'
  )

  space.save()
}

export function handleVotingStrategiesRemoved(event: VotingStrategiesRemoved): void {
  let space = Space.load(toChecksumAddress(event.address.toHexString()))
  if (space == null) {
    return
  }

  let indicesToRemove = [] as i32[]
  for (let i = 0; i < event.params.votingStrategyIndices.length; i++) {
    indicesToRemove.push(space.strategies_indices.indexOf(event.params.votingStrategyIndices[i]))
  }

  let newIndicies = [] as i32[]
  let newStrategies = [] as string[]
  let newStrategiesParams = [] as string[]
  let newStrategiesMetadata = [] as string[]
  for (let i = 0; i < space.strategies_indices.length; i++) {
    if (!indicesToRemove.includes(i)) {
      newIndicies.push(space.strategies_indices[i])
      newStrategies.push(space.strategies[i])
      newStrategiesParams.push(space.strategies_params[i])
      newStrategiesMetadata.push(space.strategies_metadata[i])
    }
  }

  space.strategies_indices = newIndicies
  space.strategies = newStrategies
  space.strategies_params = newStrategiesParams
  space.strategies_metadata = newStrategiesMetadata

  space.save()
}

export function handleProposalValidationStrategyUpdated(
  event: ProposalValidationStrategyUpdated
): void {
  let space = Space.load(toChecksumAddress(event.address.toHexString()))
  if (!space) {
    return
  }

  updateProposalValidationStrategy(
    space,
    event.params.newProposalValidationStrategy.addr,
    event.params.newProposalValidationStrategy.params,
    event.params.newProposalValidationStrategyMetadataURI,
    event.block.number
  )

  space.save()
}

export function handleAxiomWriteOffchainVotes(event: WriteOffchainVotes): void {
  let contract = AxiomExecutionStrategy.bind(event.address)
  let spaceResult = contract.try_space()
  if (spaceResult.reverted) return

  let spaceId = toChecksumAddress(spaceResult.value.toHexString())

  let proposal = Proposal.load(`${spaceId}/${event.params.proposalId}`)
  if (!proposal) return

  proposal.execution_ready = true

  proposal.save()
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
