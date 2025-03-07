import { client } from '@/helpers/kbyte';

const { web3 } = useWeb3();

export function useTownhall() {
  async function sendDiscussion(title: string, body: string) {
    return send('discussion', {
      author: web3.value.account,
      title,
      body
    });
  }

  async function sendStatement(discussion: number, statement: string) {
    return send('statement', {
      author: web3.value.account,
      discussion,
      statement
    });
  }

  async function sendVote(
    discussion: number,
    statement: number,
    choice: 1 | 2 | 3
  ) {
    return send('vote', {
      voter: web3.value.account,
      discussion,
      statement,
      choice
    });
  }

  async function send(type: string, payload: any) {
    return await client.requestAsync('broadcast', {
      from: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
      alias: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
      type,
      sig: '0xf0e14ebfa7f08ee13811725e8171465f710decd56a1e4c67cffa99e2e51acf742ef326836affeb4c8c110e89818895acc24cb0893f4bae47eddbbd57138c6ca41b',
      payload
    });
  }

  return {
    sendDiscussion,
    sendStatement,
    sendVote
  };
}
