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
        { name: 'space', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'discussionUrl', type: 'string' }
      ]
    },
    closeTopic: {
      CloseTopic: [
        { name: 'space', type: 'string' },
        { name: 'topic', type: 'uint64' }
      ]
    },
    createPost: {
      Post: [
        { name: 'space', type: 'string' },
        { name: 'topic', type: 'uint64' },
        { name: 'body', type: 'string' }
      ]
    },
    hidePost: {
      HidePost: [
        { name: 'space', type: 'string' },
        { name: 'topic', type: 'uint64' },
        { name: 'post', type: 'int' }
      ]
    },
    pinPost: {
      PinPost: [
        { name: 'space', type: 'string' },
        { name: 'topic', type: 'uint64' },
        { name: 'post', type: 'uint64' }
      ]
    },
    unpinPost: {
      UnpinPost: [
        { name: 'space', type: 'string' },
        { name: 'topic', type: 'uint64' },
        { name: 'post', type: 'uint64' }
      ]
    },
    vote: {
      Vote: [
        { name: 'space', type: 'string' },
        { name: 'topic', type: 'uint64' },
        { name: 'post', type: 'uint64' },
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
