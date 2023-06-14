import { Bytes, dataSource, json } from '@graphprotocol/graph-ts'
import { JSON } from 'assemblyscript-json'
import { SpaceMetadata, ProposalMetadata, StrategiesParsedMetadataData } from '../generated/schema'

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

  if (properties) {
    const propertiesObj = properties.toObject()

    let delegation_api_type = propertiesObj.get('delegation_api_type')
    let delegation_api_url = propertiesObj.get('delegation_api_url')
    let cover = propertiesObj.get('cover')
    let github = propertiesObj.get('github')
    let twitter = propertiesObj.get('twitter')
    let discord = propertiesObj.get('discord')
    let votingPowerSymbol = propertiesObj.get('voting_power_symbol')
    let wallets = propertiesObj.get('wallets')
    let executionStrategies = propertiesObj.get('execution_strategies')
    let executionStrategiesTypes = propertiesObj.get('execution_strategies_types')

    let delegation_api_type_value =
      delegation_api_type && !delegation_api_type.isNull() ? delegation_api_type.toString() : null
    let delegation_api_url_value =
      delegation_api_url && !delegation_api_url.isNull() ? delegation_api_url.toString() : null

    if (delegation_api_type_value == 'governor-subgraph' && delegation_api_url_value) {
      spaceMetadata.delegation_api_type = delegation_api_type_value
      spaceMetadata.delegation_api_url = delegation_api_url_value
    } else {
      spaceMetadata.delegation_api_type = null
      spaceMetadata.delegation_api_url = null
    }

    spaceMetadata.cover = cover ? cover.toString() : ''
    spaceMetadata.github = github ? github.toString() : ''
    spaceMetadata.twitter = twitter ? twitter.toString() : ''
    spaceMetadata.discord = discord ? discord.toString() : ''
    spaceMetadata.voting_power_symbol = votingPowerSymbol ? votingPowerSymbol.toString() : 'VP'
    spaceMetadata.wallet =
      wallets && wallets.toArray().length > 0 ? wallets.toArray()[0].toString() : ''

    if (executionStrategies && executionStrategiesTypes) {
      spaceMetadata.executors = executionStrategies
        .toArray()
        .map<Bytes>((strategy) => Bytes.fromByteArray(Bytes.fromHexString(strategy.toString())))
      spaceMetadata.executors_types = executionStrategiesTypes
        .toArray()
        .map<string>((type) => type.toString())
    } else {
      spaceMetadata.executors = []
      spaceMetadata.executors_types = []
    }
  } else {
    spaceMetadata.delegation_api_type = null
    spaceMetadata.delegation_api_url = null
    spaceMetadata.cover = ''
    spaceMetadata.github = ''
    spaceMetadata.twitter = ''
    spaceMetadata.discord = ''
    spaceMetadata.wallet = ''
    spaceMetadata.executors = []
    spaceMetadata.executors_types = []
  }

  spaceMetadata.save()
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

  // Using different parser for execution to overcome limitations in graph-ts
  let jsonObj: JSON.Obj = <JSON.Obj>JSON.parse(content)
  let execution = jsonObj.getArr('execution')
  if (execution) {
    proposalMetadata.execution = execution.toString()
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

    if (decimals) strategiesParsedMetadataData.decimals = decimals.toBigInt().toI32()
    if (symbol) strategiesParsedMetadataData.symbol = symbol.toString()
    if (token) strategiesParsedMetadataData.token = token.toString()
  }

  strategiesParsedMetadataData.save()
}
