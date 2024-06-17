import { StarknetL1Execution } from '../generated/schema'
import { ContractDeployed } from '../generated/L1AvatarExecutionStrategyFactory/L1AvatarExecutionStrategyFactory'
import { ProposalExecuted } from '../generated/templates/L1AvatarExecutionStrategy/L1AvatarExecutionStrategy'
import { L1AvatarExecutionStrategy as L1AvatarExecutionStrategyTemplate } from '../generated/templates'

export function handleContractDeployed(event: ContractDeployed): void {
  L1AvatarExecutionStrategyTemplate.create(event.params.contractAddress)
}

export function handleStarknetProposalExecuted(event: ProposalExecuted): void {
  let space = event.params.space.toHex()
  let paddedSpace = `0x${space.replace('0x', '').padStart(64, '0')}`
  let proposalId = event.params.proposalId.toI32()

  let executionEntity = new StarknetL1Execution(`${paddedSpace}/${proposalId}`)
  executionEntity.space = paddedSpace
  executionEntity.proposalId = proposalId
  executionEntity.created = event.block.timestamp.toI32()
  executionEntity.tx = event.transaction.hash
  executionEntity.save()
}
