import { Bytes, BigInt, ipfs, json, ethereum, Address, log } from '@graphprotocol/graph-ts'
import { JSON } from 'assemblyscript-json'
import { Space, Proposal, ExecutionStrategy, StrategiesParsedMetadata } from '../generated/schema'

const TUPLE_PREFIX = '0x0000000000000000000000000000000000000000000000000000000000000020'
const VOTING_POWER_VALIDATION_STRATEGY_PARAMS_SIGNATURE = '(uint256, (address,bytes)[])'

export function decodeProposalValidationParams(params: Bytes): ethereum.Value | null {
  let paramsBytes = Bytes.fromByteArray(
    Bytes.fromHexString(TUPLE_PREFIX + params.toHexString().slice(2))
  )

  return ethereum.decode(VOTING_POWER_VALIDATION_STRATEGY_PARAMS_SIGNATURE, paramsBytes)
}

export function getProposalValidationThreshold(params: ethereum.Value): BigInt {
  let paramsTuple = params.toTuple()

  return paramsTuple[0].toBigInt()
}

export function getProposalValidationStrategies(params: ethereum.Value): Address[] {
  let paramsTuple = params.toTuple()

  return paramsTuple[1].toArray().map<Address>((strategy) => strategy.toTuple()[0].toAddress())
}

export function getProposalValidationStrategiesParams(params: ethereum.Value): Bytes[] {
  let paramsTuple = params.toTuple()

  return paramsTuple[1].toArray().map<Bytes>((strategy) => strategy.toTuple()[1].toBytes())
}

export function updateSpaceMetadata(space: Space, metadataUri: string): void {
  if (!metadataUri.startsWith('ipfs://')) return

  let hash = metadataUri.slice(7)
  let data = ipfs.cat(hash)

  let value = json.try_fromBytes(data as Bytes)
  let obj = value.value.toObject()
  let name = obj.get('name')
  let description = obj.get('description')
  let avatar = obj.get('avatar')
  let externalUrl = obj.get('external_url')
  let properties = obj.get('properties')

  if (name) space.name = name.toString()
  space.about = description ? description.toString() : ''
  space.avatar = avatar ? avatar.toString() : ''
  space.external_url = externalUrl ? externalUrl.toString() : ''

  if (properties) {
    const propertiesObj = properties.toObject()

    let delegation_api_type = propertiesObj.get('delegation_api_type')
    let delegation_api_url = propertiesObj.get('delegation_api_url')
    let github = propertiesObj.get('github')
    let twitter = propertiesObj.get('twitter')
    let discord = propertiesObj.get('discord')
    let votingPowerSymbol = propertiesObj.get('voting_power_symbol')
    let wallets = propertiesObj.get('wallets')
    let executionStrategies = propertiesObj.get('executionStrategies')

    let delegation_api_type_value =
      delegation_api_type && !delegation_api_type.isNull() ? delegation_api_type.toString() : null
    let delegation_api_url_value =
      delegation_api_url && !delegation_api_url.isNull() ? delegation_api_url.toString() : null

    if (delegation_api_type_value == 'governor-subgraph' && delegation_api_url_value) {
      space.delegation_api_type = delegation_api_type_value
      space.delegation_api_url = delegation_api_url_value
    } else {
      space.delegation_api_type = null
      space.delegation_api_url = null
    }

    space.github = github ? github.toString() : ''
    space.twitter = twitter ? twitter.toString() : ''
    space.discord = discord ? discord.toString() : ''
    space.voting_power_symbol = votingPowerSymbol ? votingPowerSymbol.toString() : 'VP'
    space.wallet = wallets && wallets.toArray().length > 0 ? wallets.toArray()[0].toString() : ''

    if (executionStrategies) {
      space.executors = executionStrategies
        .toArray()
        .map<Bytes>((strategy) => Bytes.fromByteArray(Bytes.fromHexString(strategy.toString())))
      space.executors_types = space.executors.map<string>((executor) => {
        let executionStrategy = ExecutionStrategy.load(executor.toHexString())
        if (executionStrategy === null) return 'unknown'

        return executionStrategy.type
      })
    } else {
      space.executors = []
      space.executors_types = []
    }
  } else {
    space.delegation_api_type = null
    space.delegation_api_url = null
    space.github = ''
    space.twitter = ''
    space.discord = ''
    space.wallet = ''
    space.executors = []
    space.executors_types = []
  }
}

export function updateProposalMetadata(proposal: Proposal, metadataUri: string): void {
  if (!metadataUri.startsWith('ipfs://')) return

  let hash = metadataUri.slice(7)
  let data = ipfs.cat(hash)

  if (!data) return

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

export function updateStrategiesParsedMetadata(spaceId: string, metadataUris: string[]): void {
  for (let i = 0; i < metadataUris.length; i++) {
    let metadataUri = metadataUris[i]

    let strategyParsedMetadata = new StrategiesParsedMetadata(`${spaceId}/${i}`)
    strategyParsedMetadata.space = spaceId
    strategyParsedMetadata.index = i

    if (!metadataUri.startsWith('ipfs://')) {
      strategyParsedMetadata.save()
      continue
    }

    let hash = metadataUri.slice(7)
    let data = ipfs.cat(hash)

    if (data !== null) {
      let value = json.try_fromBytes(data as Bytes)
      let obj = value.value.toObject()
      let name = obj.get('name')
      let description = obj.get('description')
      let properties = obj.get('properties')

      strategyParsedMetadata.name = name ? name.toString() : ''
      strategyParsedMetadata.description = description ? description.toString() : ''

      if (properties) {
        let propertiesObj = properties.toObject()

        let decimals = propertiesObj.get('decimals')
        let symbol = propertiesObj.get('symbol')
        let token = propertiesObj.get('token')

        strategyParsedMetadata.decimals = decimals ? decimals.toBigInt().toI32() : 0
        strategyParsedMetadata.symbol = symbol ? symbol.toString() : ''
        if (token) {
          strategyParsedMetadata.token = token.toString()
        }
      }

      strategyParsedMetadata.save()
    }
  }
}
