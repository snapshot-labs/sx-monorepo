import { Bytes, BigInt, ipfs, json, ethereum, Address } from '@graphprotocol/graph-ts'
import { Space, ExecutionStrategy } from '../generated/schema'

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
  let externalUrl = obj.get('external_url')
  let properties = obj.get('properties')

  if (name) space.name = name.toString()
  space.about = description ? description.toString() : ''
  space.external_url = externalUrl ? externalUrl.toString() : ''

  if (properties) {
    const propertiesObj = properties.toObject()

    let github = propertiesObj.get('github')
    let twitter = propertiesObj.get('twitter')
    let discord = propertiesObj.get('discord')
    let wallets = propertiesObj.get('wallets')
    let executionStrategies = propertiesObj.get('executionStrategies')

    space.github = github ? github.toString() : ''
    space.twitter = twitter ? twitter.toString() : ''
    space.discord = discord ? discord.toString() : ''
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
    space.github = ''
    space.twitter = ''
    space.discord = ''
    space.wallet = ''
    space.executors = []
    space.executors_types = []
  }
}
