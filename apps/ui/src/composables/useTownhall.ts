import {
  ApolloClient,
  createHttpLink,
  InMemoryCache
} from '@apollo/client/core';
import { Web3Provider } from '@ethersproject/providers';
import { clients, TOWNHALL_PERMISSIONS } from '@snapshot-labs/sx';
import gql from 'graphql-tag';
import { HIGHLIGHT_URL } from '@/helpers/highlight';
import { pinPineapple } from '@/helpers/pin';
import { Alias } from '@/types';

export const ALIASES_QUERY = gql`
  query Aliases($address: String!, $alias: String!, $created_gt: Int) {
    aliases(
      where: { address: $address, alias: $alias, created_gt: $created_gt }
    ) {
      address
      alias
    }
  }
`;

export function useTownhall() {
  const { auth } = useWeb3();
  const { modalAccountOpen } = useModal();

  const alias = useAlias('townhall-aliases', loadAlias);

  const apollo = new ApolloClient({
    link: createHttpLink({ uri: HIGHLIGHT_URL }),
    cache: new InMemoryCache({
      addTypename: false
    }),
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache'
      }
    }
  });

  const highlightClient = new clients.HighlightEthereumSigClient(
    `${HIGHLIGHT_URL}/highlight`
  );

  function getSalt() {
    const buffer = new Uint8Array(32);
    crypto.getRandomValues(buffer);

    return BigInt(
      `0x${buffer.reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '')}`
    );
  }

  async function loadAlias(
    address: string,
    aliasAddress: string,
    created_gt: number
  ) {
    const {
      data: { aliases }
    }: { data: { aliases: Alias[] } } = await apollo.query({
      query: ALIASES_QUERY,
      variables: {
        address,
        alias: aliasAddress,
        created_gt
      }
    });

    return aliases?.[0] ?? null;
  }

  async function setAlias(web3: Web3Provider, alias: string) {
    const signer = web3.getSigner();
    const address = await signer.getAddress();

    return highlightClient.setAlias({
      signer: web3.getSigner(),
      data: { from: address, alias },
      salt: getSalt()
    });
  }

  async function wrapPromise(promise: Promise<any>) {
    const envelope = await promise;

    const receipt = await highlightClient.send(envelope);

    console.log('receipt', receipt);

    return receipt;
  }

  async function getAliasSigner(provider: Web3Provider) {
    return alias.getAliasWallet(address =>
      wrapPromise(setAlias(provider, address))
    );
  }

  async function sendCreateSpace() {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.createSpace({
        signer,
        salt: getSalt()
      })
    );
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

    const pinned = await pinPineapple(
      {
        name,
        description
      },
      'swarm'
    );
    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.createCategory({
        signer,
        data: {
          space,
          metadataUri: `ipfs://${pinned.cid}`,
          parentCategoryId: parentCategoryId ?? 0
        },
        salt: getSalt()
      })
    );
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

    const pinned = await pinPineapple(
      {
        name,
        description
      },
      'swarm'
    );
    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.editCategory({
        signer,
        data: {
          space,
          id,
          metadataUri: `ipfs://${pinned.cid}`,
          parentCategoryId: parentCategoryId ?? 0
        },
        salt: getSalt()
      })
    );
  }

  async function sendDeleteCategory(space: number, id: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.deleteCategory({
        signer,
        data: { space, id },
        salt: getSalt()
      })
    );
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

    const pinned = await pinPineapple(
      {
        title,
        body,
        discussionUrl
      },
      'swarm'
    );
    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.createTopic({
        signer,
        data: {
          space,
          category: categoryId ?? 0,
          metadataUri: `ipfs://${pinned.cid}`
        },
        salt: getSalt()
      })
    );
  }

  async function sendCloseTopic(space: number, topic: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.closeTopic({
        signer,
        data: { space, topic },
        salt: getSalt()
      })
    );
  }

  async function sendPost(space: number, topic: number, body: string) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const pinned = await pinPineapple({ body }, 'swarm');
    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.createPost({
        signer,
        data: { space, topic, metadataUri: `ipfs://${pinned.cid}` },
        salt: getSalt()
      })
    );
  }

  async function sendHidePost(space: number, topic: number, post: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.hidePost({
        signer,
        data: { space, topic, post },
        salt: getSalt()
      })
    );
  }

  async function sendPinPost(space: number, topic: number, post: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.pinPost({
        signer,
        data: { space, topic, post },
        salt: getSalt()
      })
    );
  }

  async function sendUnpinPost(space: number, topic: number, post: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.unpinPost({
        signer,
        data: { space, topic, post },
        salt: getSalt()
      })
    );
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

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.vote({
        signer,
        data: { space, topic, post, choice },
        salt: getSalt()
      })
    );
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

    const pinned = await pinPineapple({ name, description, color }, 'swarm');
    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.createRole({
        signer,
        data: {
          space,
          permissionLevel: isAdmin
            ? TOWNHALL_PERMISSIONS.ADMINISTRATOR
            : TOWNHALL_PERMISSIONS.DEFAULT,
          metadataUri: `ipfs://${pinned.cid}`
        },
        salt: getSalt()
      })
    );
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

    const pinned = await pinPineapple({ name, description, color }, 'swarm');
    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.editRole({
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
      })
    );
  }

  async function sendDeleteRole(space: number, id: string) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.deleteRole({
        signer,
        data: { space, id },
        salt: getSalt()
      })
    );
  }

  async function sendClaimRole(space: number, id: string) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.claimRole({
        signer,
        data: { space, id },
        salt: getSalt()
      })
    );
  }

  async function sendRevokeRole(space: number, id: string) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.revokeRole({
        signer,
        data: { space, id },
        salt: getSalt()
      })
    );
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
