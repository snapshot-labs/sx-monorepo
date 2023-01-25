import { Address, BigDecimal, Bytes, ipfs, json } from '@graphprotocol/graph-ts'
import { ProposalCreated, VoteCreated } from '../generated/Space/Space'
import { Space, Proposal, Vote, User} from '../generated/schema'

let SPACE = '0x95DC6f73301356c9909921e21b735601C42fc1a8'
let VANILLA_AUTH = '0xc4fb316710643f7FfBB566e5586862076198DAdB'
let VANILLA_STRATEGY = '0xc441215878B3869b2468BA239911BA6B506619F7'
let VANILLA_EXECUTION = '0x81519C29621Ba131ea398c15B17391F53e8B9A94'

export function handleSpaceCreated(event: ProposalCreated): void {
  let space = Space.load(SPACE)
  if (space == null) {
    space = new Space(SPACE)
    space.name = 'Fellow DAO'
    space.about = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    space.controller = event.params.proposerAddress
    space.voting_delay = 0
    space.min_voting_period = event.params.proposal.minEndTimestamp.toI32()
    space.max_voting_period = event.params.proposal.maxEndTimestamp.toI32()
    space.proposal_threshold = event.params.proposal.quorum.toBigDecimal()
    space.quorum = event.params.proposal.quorum.toBigDecimal()
    space.strategies = [Address.fromString(VANILLA_STRATEGY)]
    space.strategies_params = ['strategies params']
    space.authenticators = [Address.fromString(VANILLA_AUTH)]
    space.executors = [Address.fromString(VANILLA_EXECUTION)]
    space.proposal_count = 0
    space.vote_count = 0
    space.created = event.block.timestamp.toI32()
    space.tx = event.transaction.hash
    space.save()
  }
}

export function handleProposalCreated(event: ProposalCreated): void {
  let metadataUri = event.params.metadataUri

  handleSpaceCreated(event)

  let space = Space.load(SPACE)
  if (space == null) {
    space = new Space(SPACE)
  }

  let proposal = new Proposal(`${SPACE}/${event.params.nextProposalId}`)
  proposal.proposal_id = event.params.nextProposalId.toI32()
  proposal.space = SPACE
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
  let choice = event.params.vote.choice + 1
  let vp = event.params.vote.votingPower.toBigDecimal()

  let vote = new Vote(`${SPACE}/${event.params.proposalId}/${event.params.voterAddress.toHexString()}`)
  vote.voter = event.params.voterAddress.toHexString()
  vote.space = SPACE
  vote.proposal = event.params.proposalId.toI32()
  vote.choice = choice
  vote.vp = vp
  vote.created = event.block.timestamp.toI32()
  vote.save()

  let space = Space.load(SPACE)
  if (space !== null) {
    space.vote_count += 1
    space.save()
  }

  let proposal = Proposal.load(`${SPACE}/${event.params.proposalId}`)
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
