import { ref, Ref } from 'vue';
import apollo from '@/helpers/apollo';
import { VOTES_QUERY } from '@/helpers/queries';
import { useWeb3 } from '@/composables/useWeb3';
import type { Vote } from '@/types';

const votes: Ref<Record<string, Vote>> = ref({});

export function useAccount() {
  const { web3 } = useWeb3();

  async function loadVotes() {
    const account = web3.value.account;
    console.log('Load votes for', account);
    const { data } = await apollo.query({
      query: VOTES_QUERY,
      variables: {
        voter: account
      }
    });

    votes.value = Object.fromEntries(
      (data.votes as Vote[]).map(vote => [`${vote.space.id}/${vote.proposal}`, vote])
    );
  }

  return { account: web3.value.account, loadVotes, votes };
}
