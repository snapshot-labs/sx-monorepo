import { Web3Provider } from '@ethersproject/providers';
import { clients } from '@snapshot-labs/sx';
import { HIGHLIGHT_URL } from '@/helpers/highlight';

export function useTownhall() {
  const { auth } = useWeb3();

  // TODO: here we should resovle alias locally, separate from regular aliases
  // const alias = useAlias();

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

  // async function setAlias(web3: Web3Provider, alias: string) {
  //   const signer = web3.getSigner();
  //   const address = await signer.getAddress();

  //   return highlightClient.setAlias({
  //     signer: web3.getSigner(),
  //     data: { from: address, alias },
  //     salt: getSalt()
  //   });
  // }

  async function wrapPromise(promise: Promise<any>) {
    const envelope = await promise;

    const receipt = await highlightClient.send(envelope);

    console.log('receipt', receipt);

    return receipt;
  }

  async function getAliasSigner(provider: Web3Provider) {
    return provider.getSigner();
    // return alias.getAliasWallet(address =>
    //   wrapPromise(setAlias(provider, address))
    // );
  }

  async function sendDiscussion(title: string, body: string) {
    if (!auth.value) {
      throw new Error('Not authenticated');
    }

    const signer = await getAliasSigner(auth.value.provider);

    return wrapPromise(
      highlightClient.createDiscussion({
        signer,
        data: { title, body },
        salt: getSalt()
      })
    );
  }

  async function sendCloseDiscussion(discussion: number) {
    if (!auth.value) {
      throw new Error('Not authenticated');
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
      throw new Error('Not authenticated');
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
      throw new Error('Not authenticated');
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
      throw new Error('Not authenticated');
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
      throw new Error('Not authenticated');
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

  return {
    sendDiscussion,
    sendCloseDiscussion,
    sendStatement,
    sendHideStatement,
    sendPinStatement,
    sendVote
  };
}
