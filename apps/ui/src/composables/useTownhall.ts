import { client } from '@/helpers/kbyte';
import { Discussion, Vote } from '@/helpers/pulse';

const { web3 } = useWeb3();

const discussions: Ref<{ [key: number]: Discussion }> = ref({});
const votes: Ref<{ [key: number]: Vote[] }> = ref({});

client.subscribe(([subject, body]) => {
  if (subject === 'justsaying') {
    if (body.subject === 'new_statement') {
      const statement = body.body;
      discussions.value[statement.discussion].statements.push(statement);
    }

    if (body.subject === 'new_vote') {
      const vote = body.body;
      const statement = discussions.value[vote.discussion].statements.findIndex(
        s => s.id === vote.statement
      );
      discussions.value[vote.discussion].statements[statement].vote_count++;
      discussions.value[vote.discussion].statements[statement][
        `scores_${vote.choice}`
      ]++;
      votes.value[vote.discussion].push(vote);
    }
  }
});

export function useTownhall() {
  async function loadDiscussion(id: number) {
    discussions.value[id] = await client.requestAsync('getDiscussion', id);
    await client.requestAsync('subscribe', id);
  }

  async function loadVotes(id: number) {
    const voter = web3.value.account;

    if (voter) {
      votes.value[id] = await client.requestAsync('getVotes', [id, voter]);
    } else {
      votes.value[id] = [];
    }
  }

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
    discussions,
    votes,
    loadDiscussion,
    loadVotes,
    sendDiscussion,
    sendStatement,
    sendVote
  };
}
