import {
  Bytes,
  BigInt,
  ethereum,
  Address,
  DataSourceContext,
  BigDecimal,
} from '@graphprotocol/graph-ts'
import {
  StrategiesParsedMetadataData as StrategiesParsedMetadataDataTemplate,
  VotingPowerValidationStrategyMetadata as VotingPowerValidationStrategyMetadataTemplate,
} from '../generated/templates'
import {
  Space,
  StrategiesParsedMetadata,
  VotingPowerValidationStrategiesParsedMetadata,
} from '../generated/schema'

const TUPLE_PREFIX = '0x0000000000000000000000000000000000000000000000000000000000000020'
const VOTING_POWER_VALIDATION_STRATEGY = Address.fromString(
  '0x6D9d6D08EF6b26348Bd18F1FC8D953696b7cf311'
)
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

export function updateProposalValidationStrategy(
  space: Space,
  validationStrategyAddress: Address,
  validationStrategyParams: Bytes,
  metadataUri: string,
  blockNumber: BigInt
): void {
  space.validation_strategy = validationStrategyAddress
  space.validation_strategy_params = validationStrategyParams.toHexString()

  if (space.validation_strategy.equals(VOTING_POWER_VALIDATION_STRATEGY)) {
    space.voting_power_validation_strategy_metadata = metadataUri

    let params = decodeProposalValidationParams(validationStrategyParams)

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

    handleVotingPowerValidationMetadata(
      space.id,
      space.voting_power_validation_strategy_metadata,
      blockNumber
    )
  } else {
    space.proposal_threshold = new BigDecimal(new BigInt(0))
    space.voting_power_validation_strategy_strategies = []
    space.voting_power_validation_strategy_strategies_params = []
  }
}

export function updateStrategiesParsedMetadata(
  spaceId: string,
  metadataUris: string[],
  startingIndex: i32,
  blockNumber: BigInt,
  typeName: string = 'StrategiesParsedMetadata'
): void {
  for (let i = 0; i < metadataUris.length; i++) {
    let metadataUri = metadataUris[i]

    let index = startingIndex + i

    // blockNumber is required because sometimes it's called from IPFS handler so checking
    // for existing entity is not accurate
    // we need to do mapping based on index on UI to handle this
    let uniqueId = `${spaceId}/${blockNumber}/${index}/${metadataUri}`

    // duplication becase AssemblyScript doesn't support unions and union types
    if (typeName == 'StrategiesParsedMetadata') {
      let item = new StrategiesParsedMetadata(uniqueId)
      item.space = spaceId
      item.index = index

      if (metadataUri.startsWith('ipfs://')) {
        let hash = metadataUri.slice(7)
        item.data = hash
        StrategiesParsedMetadataDataTemplate.create(hash)
      }

      item.save()
    } else if (typeName == 'VotingPowerValidationStrategiesParsedMetadata') {
      let item = new VotingPowerValidationStrategiesParsedMetadata(uniqueId)
      item.space = spaceId
      item.index = index

      if (metadataUri.startsWith('ipfs://')) {
        let hash = metadataUri.slice(7)
        item.data = hash
        StrategiesParsedMetadataDataTemplate.create(hash)
      }

      item.save()
    }
  }
}

export function handleVotingPowerValidationMetadata(
  spaceId: string,
  metadataUri: string,
  blockNumber: BigInt
): void {
  if (metadataUri.startsWith('ipfs://')) {
    let hash = metadataUri.slice(7)

    let context = new DataSourceContext()
    context.setString('spaceId', spaceId)
    context.setBigInt('blockNumber', blockNumber)
    VotingPowerValidationStrategyMetadataTemplate.createWithContext(hash, context)
  }
}
