export const domain = {
  name: 'snapshot-x',
  version: '1'
  // chainId: 'starknet', // Expect a type "uint256" here, following EIP-155
  // verifyingContract: '0x335c0d227fbbf8d11e8d7b3788a7547495acc5ec3bf9e5031e72915a900b8c5' // StarkNet contract where to send message (voting contract), expect type "address"
};

export const spaceTypes = {
  Space: [
    { name: 'strategies', type: 'bytes32[]' }, // Define how voting power is calculated
    { name: 'votingDelay', type: 'uint32' }, // Time to wait in second for a proposal to be active after creation
    { name: 'votingPeriod', type: 'uint32' }, // Voting period in second
    { name: 'proposalThreshold', type: 'uint32' } // Minimum voting power to have to be allowed to post a proposal
  ]
};

export const proposalTypes = {
  Proposal: [
    { name: 'executionHash', type: 'bytes32' }, // Hash of EIP-712 message that contain execution details
    { name: 'metadataHash', type: 'bytes32' } // Hash of EIP-712 message that contain: title, body
  ]
};

export const voteTypes = {
  Vote: [
    { name: 'proposal', type: 'bytes32' }, // Hash of EIP-712 proposal message
    { name: 'choice', type: 'uint32' } // Possible choice: 0 = against, 1 = for, 2 = abstain
  ]
};

export interface IProposal {
  executionHash: string;
  metadataHash: string;
}

export interface IVote {
  proposal: string;
  choice: number;
}
