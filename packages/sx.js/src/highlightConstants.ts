export const HIGHLIGHT_DOMAIN = {
  name: 'highlight',
  version: '0.1.0'
};

export const ALIASES_CONFIG = {
  address: '0x0000000000000000000000000000000000000001',
  types: {
    setAlias: {
      SetAlias: [
        { name: 'from', type: 'address' },
        { name: 'alias', type: 'address' }
      ]
    }
  }
};

export const TOWNHALL_CONFIG = {
  address: '0x0000000000000000000000000000000000000002',
  types: {
    createDiscussion: {
      Discussion: [
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'discussionUrl', type: 'string' }
      ]
    },
    closeDiscussion: {
      CloseDiscussion: [{ name: 'discussion', type: 'uint64' }]
    },
    createStatement: {
      Statement: [
        { name: 'discussion', type: 'uint64' },
        { name: 'statement', type: 'string' }
      ]
    },
    hideStatement: {
      HideStatement: [
        { name: 'discussion', type: 'uint64' },
        { name: 'statement', type: 'int' }
      ]
    },
    pinStatement: {
      PinStatement: [
        { name: 'discussion', type: 'uint64' },
        { name: 'statement', type: 'uint64' }
      ]
    },
    unpinStatement: {
      UnpinStatement: [
        { name: 'discussion', type: 'uint64' },
        { name: 'statement', type: 'uint64' }
      ]
    },
    vote: {
      Vote: [
        { name: 'discussion', type: 'uint64' },
        { name: 'statement', type: 'uint64' },
        { name: 'choice', type: 'uint64' }
      ]
    },
    createRole: {
      CreateRole: [
        { name: 'space', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'color', type: 'string' }
      ]
    },
    editRole: {
      EditRole: [
        { name: 'space', type: 'string' },
        { name: 'id', type: 'uint64' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'color', type: 'string' }
      ]
    },
    deleteRole: {
      DeleteRole: [
        { name: 'space', type: 'string' },
        { name: 'id', type: 'uint64' }
      ]
    },
    claimRole: {
      ClaimRole: [
        { name: 'space', type: 'string' },
        { name: 'id', type: 'uint64' }
      ]
    },
    revokeRole: {
      RevokeRole: [
        { name: 'space', type: 'string' },
        { name: 'id', type: 'uint64' }
      ]
    }
  }
};
