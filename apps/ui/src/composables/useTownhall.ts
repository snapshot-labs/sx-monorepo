import { clients, TOWNHALL_PERMISSIONS } from '@snapshot-labs/sx';
import { MANA_URL } from '@/helpers/mana';
import { pin } from '@/helpers/pin';

const TOWNHALL_CHAIN_ID = import.meta.env.VITE_TOWNHALL_CHAIN_ID || '8453';

export function useTownhall() {
  const { auth } = useWeb3();
  const { modalAccountOpen } = useModal();

  const highlightClient = new clients.HighlightEthereumSigClient();

  function getSalt() {
    const buffer = new Uint8Array(32);
    crypto.getRandomValues(buffer);

    return BigInt(
      `0x${buffer.reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '')}`
    );
  }

  async function sendToMana(envelope: any) {
    const res = await fetch(`${MANA_URL}/eth_rpc/${TOWNHALL_CHAIN_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'sendTownhallEnvelope',
        params: { envelope },
        id: null
      })
    });

    const { error, result } = await res.json();
    if (error) {
      const reason =
        error.data?.reason || error.data?.message || error.message;
      throw new Error(reason || 'Failed to send townhall envelope');
    }

    return result;
  }

  async function sendCreateSpace() {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.createSpace({
      signer,
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendCreateCategory(
    space: number,
    name: string,
    description: string,
    parentCategoryId: number | null
  ) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const pinned = await pin(
      {
        name,
        description
      },
      undefined,
      { protocol: 'swarm' }
    );
    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.createCategory({
      signer,
      data: {
        space,
        metadataUri: `ipfs://${pinned.cid}`,
        parentCategoryId: parentCategoryId ?? 0
      },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendEditCategory(
    space: number,
    id: number,
    name: string,
    description: string,
    parentCategoryId: number | null
  ) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const pinned = await pin(
      {
        name,
        description
      },
      undefined,
      { protocol: 'swarm' }
    );
    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.editCategory({
      signer,
      data: {
        space,
        id,
        metadataUri: `ipfs://${pinned.cid}`,
        parentCategoryId: parentCategoryId ?? 0
      },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendDeleteCategory(space: number, id: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.deleteCategory({
      signer,
      data: { space, id },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendTopic(
    space: number,
    title: string,
    body: string,
    discussionUrl: string,
    categoryId: number | null
  ) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const pinned = await pin(
      {
        title,
        body,
        discussionUrl
      },
      undefined,
      { protocol: 'swarm' }
    );
    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.createTopic({
      signer,
      data: {
        space,
        category: categoryId ?? 0,
        metadataUri: `ipfs://${pinned.cid}`
      },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendCloseTopic(space: number, topic: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.closeTopic({
      signer,
      data: { space, topic },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendPost(space: number, topic: number, body: string) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const pinned = await pin({ body }, undefined, {
      protocol: 'swarm'
    });
    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.createPost({
      signer,
      data: { space, topic, metadataUri: `ipfs://${pinned.cid}` },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendHidePost(space: number, topic: number, post: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.hidePost({
      signer,
      data: { space, topic, post },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendPinPost(space: number, topic: number, post: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.pinPost({
      signer,
      data: { space, topic, post },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendUnpinPost(space: number, topic: number, post: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.unpinPost({
      signer,
      data: { space, topic, post },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendVote(
    space: number,
    topic: number,
    post: number,
    choice: 1 | 2 | 3
  ) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.vote({
      signer,
      data: { space, topic, post, choice },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendCreateRole(
    space: number,
    name: string,
    description: string,
    color: string,
    isAdmin: boolean
  ) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const pinned = await pin({ name, description, color }, undefined, {
      protocol: 'swarm'
    });
    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.createRole({
      signer,
      data: {
        space,
        permissionLevel: isAdmin
          ? TOWNHALL_PERMISSIONS.ADMINISTRATOR
          : TOWNHALL_PERMISSIONS.DEFAULT,
        metadataUri: `ipfs://${pinned.cid}`
      },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendEditRole(
    space: number,
    id: string,
    name: string,
    description: string,
    color: string,
    isAdmin: boolean
  ) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const pinned = await pin({ name, description, color }, undefined, {
      protocol: 'swarm'
    });
    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.editRole({
      signer,
      data: {
        space,
        id,
        permissionLevel: isAdmin
          ? TOWNHALL_PERMISSIONS.ADMINISTRATOR
          : TOWNHALL_PERMISSIONS.DEFAULT,
        metadataUri: `ipfs://${pinned.cid}`
      },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendDeleteRole(space: number, id: string) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.deleteRole({
      signer,
      data: { space, id },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendClaimRole(space: number, id: string) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.claimRole({
      signer,
      data: { space, id },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  async function sendRevokeRole(space: number, id: string) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = auth.value.provider.getSigner();

    const envelope = await highlightClient.revokeRole({
      signer,
      data: { space, id },
      salt: getSalt()
    });

    return sendToMana(envelope);
  }

  return {
    sendCreateSpace,
    sendCreateCategory,
    sendEditCategory,
    sendDeleteCategory,
    sendTopic,
    sendCloseTopic,
    sendPost,
    sendHidePost,
    sendPinPost,
    sendUnpinPost,
    sendVote,
    sendCreateRole,
    sendEditRole,
    sendDeleteRole,
    sendClaimRole,
    sendRevokeRole
  };
}
