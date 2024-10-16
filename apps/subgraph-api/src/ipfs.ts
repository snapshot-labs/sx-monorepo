import { Bytes, dataSource, json } from '@graphprotocol/graph-ts'
import { JSON } from 'assemblyscript-json'
import {
  SpaceMetadata,
  ProposalMetadata,
  VoteMetadata,
  StrategiesParsedMetadataData,
} from '../generated/schema'
import { toChecksumAddress, updateStrategiesParsedMetadata } from './helpers'

export function handleSpaceMetadata(content: Bytes): void {
  let spaceMetadata = new SpaceMetadata(dataSource.stringParam())

  let value = json.fromBytes(content)
  let obj = value.toObject()
  let name = obj.get('name')
  let description = obj.get('description')
  let avatar = obj.get('avatar')
  let externalUrl = obj.get('external_url')
  let properties = obj.get('properties')

  spaceMetadata.name = name ? name.toString() : ''
  spaceMetadata.about = description ? description.toString() : ''
  spaceMetadata.avatar = avatar ? avatar.toString() : ''
  spaceMetadata.external_url = externalUrl ? externalUrl.toString() : ''
  spaceMetadata.wallet = ''
  spaceMetadata.treasuries = []
  spaceMetadata.labels = []
  spaceMetadata.delegations = []

  if (properties) {
    const propertiesObj = properties.toObject()

    let treasuries = propertiesObj.get('treasuries')
    let labels = propertiesObj.get('labels')
    let delegations = propertiesObj.get('delegations')
    let cover = propertiesObj.get('cover')
    let github = propertiesObj.get('github')
    let twitter = propertiesObj.get('twitter')
    let discord = propertiesObj.get('discord')
    let votingPowerSymbol = propertiesObj.get('voting_power_symbol')
    let executionStrategies = propertiesObj.get('execution_strategies')
    let executionStrategiesTypes = propertiesObj.get('execution_strategies_types')
    let executionDestinations = propertiesObj.get('execution_destinations')

    let jsonObj: JSON.Obj = <JSON.Obj>JSON.parse(content)
    let jsonPropertiesObj = jsonObj.getObj('properties')
    if (jsonPropertiesObj && treasuries) {
      let jsonTreasuriesArr = jsonPropertiesObj.getArr('treasuries')
      if (jsonTreasuriesArr) {
        spaceMetadata.treasuries = jsonTreasuriesArr._arr.map<string>((treasury) =>
          treasury.toString()
        )
      }
    }

    if (jsonPropertiesObj && labels) {
      let jsonLabelsArr = jsonPropertiesObj.getArr('labels')
      if (jsonLabelsArr) {
        spaceMetadata.labels = jsonLabelsArr._arr.map<string>((label) =>
          label.toString()
        )
      }
    }

    if (delegations) {
      let jsonObj: JSON.Obj = <JSON.Obj>JSON.parse(content)
      let jsonPropertiesObj = jsonObj.getObj('properties')
      if (jsonPropertiesObj) {
        let jsonDelegationsArr = jsonPropertiesObj.getArr('delegations')
        if (jsonDelegationsArr) {
          spaceMetadata.delegations = jsonDelegationsArr._arr.map<string>((delegation) =>
            delegation.toString()
          )
        }
      }
    }

    spaceMetadata.cover = cover ? cover.toString() : ''
    spaceMetadata.github = github ? github.toString() : ''
    spaceMetadata.twitter = twitter ? twitter.toString() : ''
    spaceMetadata.discord = discord ? discord.toString() : ''
    spaceMetadata.voting_power_symbol = votingPowerSymbol ? votingPowerSymbol.toString() : 'VP'

    if (executionStrategies && executionStrategiesTypes && executionDestinations) {
      spaceMetadata.executors = executionStrategies
        .toArray()
        .map<string>((strategy) => toChecksumAddress(strategy.toString()))
      spaceMetadata.executors_types = executionStrategiesTypes
        .toArray()
        .map<string>((type) => type.toString())
      spaceMetadata.executors_strategies = executionStrategies
        .toArray()
        .map<string>((strategy) => toChecksumAddress(strategy.toString()))
      spaceMetadata.executors_destinations = executionDestinations
        .toArray()
        .map<string>((destination) => destination.toString())
    } else {
      spaceMetadata.executors = []
      spaceMetadata.executors_types = []
      spaceMetadata.executors_destinations = []
      spaceMetadata.executors_strategies = []
    }
  } else {
    spaceMetadata.cover = ''
    spaceMetadata.github = ''
    spaceMetadata.twitter = ''
    spaceMetadata.discord = ''
    spaceMetadata.executors = []
    spaceMetadata.executors_types = []
    spaceMetadata.executors_destinations = []
    spaceMetadata.executors_strategies = []
  }

  spaceMetadata.save()
}

export function handleVoteMetadata(content: Bytes): void {
  let proposalMetadata = new VoteMetadata(dataSource.stringParam())

  let value = json.fromBytes(content)
  let obj = value.toObject()
  let reason = obj.get('reason')

  proposalMetadata.reason = reason ? reason.toString() : ''
  proposalMetadata.save()
}

export function handleProposalMetadata(content: Bytes): void {
  let proposalMetadata = new ProposalMetadata(dataSource.stringParam())

  let value = json.fromBytes(content)
  let obj = value.toObject()
  let title = obj.get('title')
  let body = obj.get('body')
  let discussion = obj.get('discussion')

  proposalMetadata.title = title ? title.toString() : ''
  proposalMetadata.body = body ? body.toString() : ''
  proposalMetadata.discussion = discussion ? discussion.toString() : ''
  proposalMetadata.execution = ''
  proposalMetadata.labels = []

  // Using different parser for execution to overcome limitations in graph-ts
  let jsonObj: JSON.Obj = <JSON.Obj>JSON.parse(content)
  let execution = jsonObj.getArr('execution')
  if (execution) {
    proposalMetadata.execution = execution.toString()
  }

  let labels = jsonObj.getArr('labels')
  if (labels) {
    proposalMetadata.labels = labels._arr.map<string>((label) => label.toString())
  }

  proposalMetadata.save()
}

export function handleStrategiesParsedMetadataData(content: Bytes): void {
  let strategiesParsedMetadataData = new StrategiesParsedMetadataData(dataSource.stringParam())

  strategiesParsedMetadataData.name = ''
  strategiesParsedMetadataData.description = ''
  strategiesParsedMetadataData.decimals = 0
  strategiesParsedMetadataData.symbol = ''

  let value = json.fromBytes(content)
  let obj = value.toObject()
  let name = obj.get('name')
  let description = obj.get('description')
  let properties = obj.get('properties')

  if (name) strategiesParsedMetadataData.name = name.toString()
  if (description) strategiesParsedMetadataData.description = description.toString()

  if (properties) {
    let propertiesObj = properties.toObject()

    let decimals = propertiesObj.get('decimals')
    let symbol = propertiesObj.get('symbol')
    let token = propertiesObj.get('token')
    let payload = propertiesObj.get('payload')

    if (decimals) strategiesParsedMetadataData.decimals = decimals.toBigInt().toI32()
    if (symbol) strategiesParsedMetadataData.symbol = symbol.toString()
    if (token) strategiesParsedMetadataData.token = token.toString()
    if (payload) strategiesParsedMetadataData.payload = payload.toString()
  }

  strategiesParsedMetadataData.save()
}

export function handleVotingPowerValidationStrategyMetadata(content: Bytes): void {
  let spaceId = dataSource.context().getString('spaceId')
  let blockNumber = dataSource.context().getBigInt('blockNumber')

  let value = json.fromBytes(content)
  let obj = value.toObject()
  let strategies_metadata = obj.get('strategies_metadata')

  if (!strategies_metadata) return

  updateStrategiesParsedMetadata(
    spaceId,
    strategies_metadata.toArray().map<string>((metadata) => metadata.toString()),
    0,
    blockNumber,
    'VotingPowerValidationStrategiesParsedMetadata'
  )
}
