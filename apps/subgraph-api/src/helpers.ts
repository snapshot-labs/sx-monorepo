import { Bytes, BigInt, ethereum, Address } from '@graphprotocol/graph-ts'
import { StrategiesParsedMetadataData as StrategiesParsedMetadataDataTemplate } from '../generated/templates'
import { StrategiesParsedMetadata } from '../generated/schema'

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

export function updateStrategiesParsedMetadata(spaceId: string, metadataUris: string[]): void {
  for (let i = 0; i < metadataUris.length; i++) {
    let metadataUri = metadataUris[i]

    let strategyParsedMetadata = new StrategiesParsedMetadata(`${spaceId}/${i}`)
    strategyParsedMetadata.space = spaceId
    strategyParsedMetadata.index = i

    if (metadataUri.startsWith('ipfs://')) {
      let hash = metadataUri.slice(7)
      strategyParsedMetadata.data = hash
      StrategiesParsedMetadataDataTemplate.create(hash)
    }

    strategyParsedMetadata.save()
  }
}
