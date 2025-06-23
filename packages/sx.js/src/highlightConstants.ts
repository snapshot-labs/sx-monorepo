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
    createCategory: {
      CreateCategory: [
        { name: 'space', type: 'uint64' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'parentCategoryId', type: 'uint64' }
      ]
    },
    editCategory: {
      EditCategory: [
        { name: 'space', type: 'uint64' },
        { name: 'id', type: 'uint64' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'parentCategoryId', type: 'uint64' }
      ]
    },
    deleteCategory: {
      DeleteCategory: [
        { name: 'space', type: 'uint64' },
        { name: 'id', type: 'uint64' }
      ]
    },
    createTopic: {
      Topic: [
        { name: 'space', type: 'uint64' },
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'discussionUrl', type: 'string' }
      ]
    },
    closeTopic: {
      CloseTopic: [
        { name: 'space', type: 'uint64' },
        { name: 'topic', type: 'uint64' }
      ]
    },
    createPost: {
      Post: [
        { name: 'space', type: 'uint64' },
        { name: 'topic', type: 'uint64' },
        { name: 'body', type: 'string' }
      ]
    },
    hidePost: {
      HidePost: [
        { name: 'space', type: 'uint64' },
        { name: 'topic', type: 'uint64' },
        { name: 'post', type: 'int' }
      ]
    },
    pinPost: {
      PinPost: [
        { name: 'space', type: 'uint64' },
        { name: 'topic', type: 'uint64' },
        { name: 'post', type: 'uint64' }
      ]
    },
    unpinPost: {
      UnpinPost: [
        { name: 'space', type: 'uint64' },
        { name: 'topic', type: 'uint64' },
        { name: 'post', type: 'uint64' }
      ]
    },
    vote: {
      Vote: [
        { name: 'space', type: 'uint64' },
        { name: 'topic', type: 'uint64' },
        { name: 'post', type: 'uint64' },
        { name: 'choice', type: 'uint64' }
      ]
    },
    createRole: {
      CreateRole: [
        { name: 'space', type: 'uint64' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'color', type: 'string' }
      ]
    },
    editRole: {
      EditRole: [
        { name: 'space', type: 'uint64' },
        { name: 'id', type: 'uint64' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'color', type: 'string' }
      ]
    },
    deleteRole: {
      DeleteRole: [
        { name: 'space', type: 'uint64' },
        { name: 'id', type: 'uint64' }
      ]
    },
    claimRole: {
      ClaimRole: [
        { name: 'space', type: 'uint64' },
        { name: 'id', type: 'uint64' }
      ]
    },
    revokeRole: {
      RevokeRole: [
        { name: 'space', type: 'uint64' },
        { name: 'id', type: 'uint64' }
      ]
    }
  }
};
