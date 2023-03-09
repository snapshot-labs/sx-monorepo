import { Address, BigDecimal, BigInt, Bytes, ipfs, json } from '@graphprotocol/graph-ts'
import { JSON } from 'assemblyscript-json'
import { SpaceCreated } from '../generated/SpaceFactory/SpaceFactory'
import { IExecutionStrategy } from '../generated/SpaceFactory/IExecutionStrategy'
import {
  Space as SpaceContract,
  ProposalCreated,
  ProposalExecuted,
  VoteCreated,
  MetadataUriUpdated,
} from '../generated/templates/Space/Space'
import { Space as SpaceTemplate } from '../generated/templates'
import { Space, Proposal, Vote, User } from '../generated/schema'

function updateSpaceMetadata(space: Space, metadataUri: string): void {
  if (!metadataUri.startsWith('ipfs://')) return

  let hash = metadataUri.slice(7)
  let data = ipfs.cat(hash)

  let value = json.try_fromBytes(data as Bytes)
  let obj = value.value.toObject()
  let name = obj.get('name')
  let description = obj.get('description')
  let externalUrl = obj.get('external_url')
  let properties = obj.get('properties')

  if (name) space.name = name.toString()
  if (description) space.about = description.toString()
  if (externalUrl) space.external_url = externalUrl.toString()

  if (properties) {
    const propertiesObj = properties.toObject()

    let github = propertiesObj.get('github')
    let twitter = propertiesObj.get('twitter')
    let discord = propertiesObj.get('discord')
    let wallets = propertiesObj.get('wallets')

    if (github) space.github = github.toString()
    if (twitter) space.twitter = twitter.toString()
    if (discord) space.discord = discord.toString()
    if (wallets && wallets.toArray().length > 0) space.wallet = wallets.toArray()[0].toString()
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
  space.proposal_threshold = event.params.proposalThreshold.toBigDecimal()
  space.quorum = new BigDecimal(new BigInt(0))
  space.strategies = event.params.votingStrategies.map<Bytes>((strategy) => strategy.addy)
  space.strategies_params = event.params.votingStrategies.map<string>((strategy) =>
    strategy.params.toHexString()
  )
  space.strategies_metadata = event.params.votingStrategyMetadata.map<string>((metadata) =>
    metadata.toHexString()
  )
  space.authenticators = event.params.authenticators.map<Bytes>((address) => address)
  space.executors = event.params.executionStrategies.map<Bytes>((strategy) => strategy.addy)
  space.proposal_count = 0
  space.vote_count = 0
  space.created = event.block.timestamp.toI32()
  space.tx = event.transaction.hash

  space.executors_types = event.params.executionStrategies.map<string>((strategy) => {
    let executionStrategyContract = IExecutionStrategy.bind(
      Address.fromString(strategy.addy.toHexString())
    )

    let typeResult = executionStrategyContract.try_getStrategyType()
    if (typeResult.reverted) return ''
    return typeResult.value
  })

  updateSpaceMetadata(space, event.params.metadataUri)

  space.save()

  SpaceTemplate.create(event.params.space)
}

export function handleProposalCreated(event: ProposalCreated): void {
  let space = Space.load(event.address.toHexString())
  if (space == null) {
    return
  }

  let metadataUri = event.params.metadataUri

  let proposal = new Proposal(`${space.id}/${event.params.nextProposalId}`)
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

  let spaceContract = SpaceContract.bind(Address.fromString(space.id))
  let quorumResult = spaceContract.try_quorum(event.params.nextProposalId)
  if (!quorumResult.reverted) {
    proposal.quorum = new BigDecimal(quorumResult.value)
  }

  if (metadataUri.startsWith('ipfs://')) {
    let hash = metadataUri.slice(7)
    let data = ipfs.cat(hash)

    if (data !== null) {
      let value = json.try_fromBytes(data as Bytes)
      let obj = value.value.toObject()
      let title = obj.get('title')
      let body = obj.get('body')
      let discussion = obj.get('discussion')

      if (title) proposal.title = title.toString()
      if (body) proposal.body = body.toString()
      if (discussion) proposal.discussion = discussion.toString()

      // Using different parser for execution to overcome limitations in graph-ts
      let jsonObj: JSON.Obj = <JSON.Obj>JSON.parse(data.toString())
      let execution = jsonObj.getArr('execution')
      if (execution) {
        proposal.execution = execution.toString()
      }
    }
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

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposal = Proposal.load(`${event.address.toHexString()}/${event.params.proposalId}`)
  if (proposal == null) {
    return
  }

  proposal.executed = true

  proposal.save()
}

export function handleVoteCreated(event: VoteCreated): void {
  let space = Space.load(event.address.toHexString())
  if (space == null) {
    return
  }

  // Swap For/Against
  let choice = event.params.vote.choice
  if (event.params.vote.choice === 0) choice = 2
  if (event.params.vote.choice === 1) choice = 1
  if (event.params.vote.choice === 2) choice = 3

  let vp = event.params.vote.votingPower.toBigDecimal()

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

export function handleMetadataUriUpdated(event: MetadataUriUpdated): void {
  let space = Space.load(event.address.toHexString())
  if (space == null) {
    return
  }

  updateSpaceMetadata(space, event.params.newMetadataUri)

  space.save()
}
