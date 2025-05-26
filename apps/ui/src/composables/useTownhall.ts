import {
  ApolloClient,
  createHttpLink,
  InMemoryCache
} from '@apollo/client/core';
import { Web3Provider } from '@ethersproject/providers';
import { clients } from '@snapshot-labs/sx';
import gql from 'graphql-tag';
import { HIGHLIGHT_URL } from '@/helpers/highlight';
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

  async function sendDiscussion(
    title: string,
    body: string,
    discussionUrl: string
  ) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.createDiscussion({
        signer,
        data: { title, body, discussionUrl },
        salt: getSalt()
      })
    );
  }

  async function sendCloseDiscussion(discussion: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.closeDiscussion({
        signer,
        data: { discussion },
        salt: getSalt()
      })
    );
  }

  async function sendStatement(discussion: number, statement: string) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.createStatement({
        signer,
        data: { discussion, statement },
        salt: getSalt()
      })
    );
  }

  async function sendHideStatement(discussion: number, statement: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.hideStatement({
        signer,
        data: { discussion, statement },
        salt: getSalt()
      })
    );
  }

  async function sendPinStatement(discussion: number, statement: number) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.pinStatement({
        signer,
        data: { discussion, statement },
        salt: getSalt()
      })
    );
  }

  async function sendVote(
    discussion: number,
    statement: number,
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
        data: { discussion, statement, choice },
        salt: getSalt()
      })
    );
  }

  async function sendCreateRole(
    space: string,
    name: string,
    description: string,
    color: string
  ) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.createRole({
        signer,
        data: { space, name, description, color },
        salt: getSalt()
      })
    );
  }

  async function sendEditRole(
    space: string,
    id: string,
    name: string,
    description: string,
    color: string
  ) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.editRole({
        signer,
        data: { space, id, name, description, color },
        salt: getSalt()
      })
    );
  }

  async function sendDeleteRole(space: string, id: string) {
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

  async function sendClaimRole(space: string, id: string) {
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

  async function sendRevokeRole(space: string, id: string) {
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

  async function sendAddCategory(parent: number, name: string, about: string) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return null;
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.addCategory({
        signer,
        data: { parent, name, about },
        salt: getSalt()
      })
    );
  }

  return {
    sendDiscussion,
    sendCloseDiscussion,
    sendStatement,
    sendHideStatement,
    sendPinStatement,
    sendVote,
    sendCreateRole,
    sendEditRole,
    sendDeleteRole,
    sendClaimRole,
    sendRevokeRole,
    sendAddCategory
  };
}
