import { BigDecimal, Bytes, ipfs, json } from '@graphprotocol/graph-ts'
import { JSON } from 'assemblyscript-json'
import { SpaceCreated } from '../generated/SpaceFactory/SpaceFactory'
import { ProposalCreated, VoteCreated, MetadataUriUpdated } from '../generated/Space/Space'
import { Space as SpaceTemplate } from '../generated/templates'
import { Space, Proposal, Vote, User } from '../generated/schema'

export function handleSpaceCreated(event: SpaceCreated): void {
  let space = new Space(event.params.space.toHexString())
  space.name = 'Fellow DAO ' + event.params.space.toHexString().slice(0, 6)
  space.about = ''
  space.controller = event.params.owner
  space.voting_delay = event.params.votingDelay.toI32()
  space.min_voting_period = event.params.minVotingDuration.toI32()
  space.max_voting_period = event.params.maxVotingDuration.toI32()
  space.proposal_threshold = event.params.proposalThreshold.toBigDecimal()
  space.quorum = event.params.quorum.toBigDecimal()
  space.strategies = event.params.votingStrategies.map<Bytes>((strategy) => strategy.addy)
  space.strategies_params = event.params.votingStrategies.map<string>((strategy) =>
    strategy.params.toHexString()
  )
  space.authenticators = event.params.authenticators.map<Bytes>((address) => address)
  space.executors = event.params.executionStrategiesAddresses.map<Bytes>((address) => address)
  space.proposal_count = 0
  space.vote_count = 0
  space.created = event.block.timestamp.toI32()
  space.tx = event.transaction.hash
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
  proposal.author = event.params.proposerAddress.toHexString()
  proposal.execution_hash = event.params.proposal.executionHash.toHexString()
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
  proposal.quorum = event.params.proposal.quorum.toBigDecimal()
  proposal.created = event.block.timestamp.toI32()
  proposal.tx = event.transaction.hash
  proposal.vote_count = 0

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

  let user = User.load(event.params.proposerAddress.toHexString())
  if (user == null) {
    user = new User(event.params.proposerAddress.toHexString())
    user.proposal_count = 0
    user.vote_count = 0
    user.created = event.block.timestamp.toI32()
    user.save()
  }
  user.proposal_count += 1
  user.save()
}

export function handleVoteCreated(event: VoteCreated): void {
  let space = Space.load(event.address.toHexString())
  if (space == null) {
    return
  }

  let choice = event.params.vote.choice + 1
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

  let metadataUri = event.params.newMetadataUri

  if (metadataUri.startsWith('ipfs://')) {
    let hash = metadataUri.slice(7)
    let data = ipfs.cat(hash)

    if (data !== null) {
      let value = json.try_fromBytes(data as Bytes)
      let obj = value.value.toObject()
      let title = obj.get('name')
      let description = obj.get('description')

      if (title) space.name = title.toString()
      if (description) space.about = description.toString()
    }
  }

  space.save()
}
