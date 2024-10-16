export const domain = {
  name: 'snapshot',
  version: '0.1.4'
};

export const basicVoteTypes = {
  Vote: [
    { name: 'from', type: 'address' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'proposal', type: 'string' },
    { name: 'choice', type: 'uint32' },
    { name: 'reason', type: 'string' },
    { name: 'app', type: 'string' },
    { name: 'metadata', type: 'string' }
  ]
};

export const singleChoiceVoteTypes = basicVoteTypes;

export const approvalVoteTypes = {
  Vote: [
    { name: 'from', type: 'address' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'proposal', type: 'string' },
    { name: 'choice', type: 'uint32[]' },
    { name: 'reason', type: 'string' },
    { name: 'app', type: 'string' },
    { name: 'metadata', type: 'string' }
  ]
};

export const rankedChoiceVoteTypes = approvalVoteTypes;

export const encryptedVoteTypes = {
  Vote: [
    { name: 'from', type: 'address' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'proposal', type: 'bytes32' },
    { name: 'choice', type: 'string' },
    { name: 'reason', type: 'string' },
    { name: 'app', type: 'string' },
    { name: 'metadata', type: 'string' }
  ]
};

export const weightedVoteTypes = {
  Vote: [
    { name: 'from', type: 'address' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'proposal', type: 'string' },
    { name: 'choice', type: 'string' },
    { name: 'reason', type: 'string' },
    { name: 'app', type: 'string' },
    { name: 'metadata', type: 'string' }
  ]
};

export const proposeTypes = {
  Proposal: [
    { name: 'from', type: 'address' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'type', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'body', type: 'string' },
    { name: 'discussion', type: 'string' },
    { name: 'choices', type: 'string[]' },
    { name: 'labels', type: 'string[]' },
    { name: 'start', type: 'uint64' },
    { name: 'end', type: 'uint64' },
    { name: 'snapshot', type: 'uint64' },
    { name: 'plugins', type: 'string' },
    { name: 'app', type: 'string' }
  ]
};

export const updateProposalTypes = {
  UpdateProposal: [
    { name: 'proposal', type: 'string' },
    { name: 'from', type: 'address' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'type', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'body', type: 'string' },
    { name: 'discussion', type: 'string' },
    { name: 'choices', type: 'string[]' },
    { name: 'plugins', type: 'string' }
  ]
};

export const cancelProposalTypes = {
  CancelProposal: [
    { name: 'from', type: 'address' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'proposal', type: 'bytes32' }
  ]
};

export const followSpaceTypes = {
  Follow: [
    { name: 'from', type: 'string' },
    { name: 'network', type: 'string' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' }
  ]
};

export const unfollowSpaceTypes = {
  Unfollow: [
    { name: 'from', type: 'string' },
    { name: 'network', type: 'string' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' }
  ]
};

export const aliasTypes = {
  Alias: [
    { name: 'from', type: 'address' },
    { name: 'alias', type: 'address' },
    { name: 'timestamp', type: 'uint64' }
  ]
};

export const updateUserTypes = {
  Profile: [
    { name: 'from', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'profile', type: 'string' }
  ]
};

export const updateStatementTypes = {
  Statement: [
    { name: 'from', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'space', type: 'string' },
    { name: 'about', type: 'string' },
    { name: 'statement', type: 'string' },
    { name: 'discourse', type: 'string' },
    { name: 'status', type: 'string' },
    { name: 'network', type: 'string' }
  ]
};

export const updateSpaceTypes = {
  Space: [
    { name: 'from', type: 'address' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'settings', type: 'string' }
  ]
};

export const deleteSpaceTypes = {
  DeleteSpace: [
    { name: 'from', type: 'address' },
    { name: 'space', type: 'string' },
    { name: 'timestamp', type: 'uint64' }
  ]
};
