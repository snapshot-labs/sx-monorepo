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
    createTopic: {
      Topic: [
        { name: 'space', type: 'uint64' },
        { name: 'metadataUri', type: 'string' }
      ]
    },
    closeTopic: {
      CloseTopic: [{ name: 'topic', type: 'uint64' }]
    },
    createPost: {
      Post: [
        { name: 'topic', type: 'uint64' },
        { name: 'metadataUri', type: 'string' }
      ]
    },
    hidePost: {
      HidePost: [
        { name: 'topic', type: 'uint64' },
        { name: 'post', type: 'int' }
      ]
    },
    pinPost: {
      PinPost: [
        { name: 'topic', type: 'uint64' },
        { name: 'post', type: 'uint64' }
      ]
    },
    unpinPost: {
      UnpinPost: [
        { name: 'topic', type: 'uint64' },
        { name: 'post', type: 'uint64' }
      ]
    },
    vote: {
      Vote: [
        { name: 'topic', type: 'uint64' },
        { name: 'post', type: 'uint64' },
        { name: 'choice', type: 'uint64' }
      ]
    },
    createRole: {
      CreateRole: [
        { name: 'space', type: 'uint64' },
        { name: 'metadataUri', type: 'string' }
      ]
    },
    editRole: {
      EditRole: [
        { name: 'space', type: 'string' },
        { name: 'id', type: 'uint64' },
        { name: 'metadataUri', type: 'string' }
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
