export const domain = {
  name: 'snapshot',
  version: '0.1.4'
};

const baseVoteTypes = [
  { name: 'from', type: 'address' },
  { name: 'space', type: 'string' },
  { name: 'timestamp', type: 'uint64' },
  { name: 'proposal', type: 'string' },
  { name: 'reason', type: 'string' },
  { name: 'app', type: 'string' },
  { name: 'metadata', type: 'string' }
];

export const basicVoteTypes = {
  Vote: [...baseVoteTypes, { name: 'choice', type: 'uint32' }]
};

export const singleChoiceVoteTypes = basicVoteTypes;

export const approvalVoteTypes = {
  Vote: [...baseVoteTypes, { name: 'choice', type: 'uint32[]' }]
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
    { name: 'start', type: 'uint64' },
    { name: 'end', type: 'uint64' },
    { name: 'snapshot', type: 'uint64' },
    { name: 'plugins', type: 'string' },
    { name: 'app', type: 'string' }
  ]
};
