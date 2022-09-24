import { ref, Ref } from 'vue';
import apollo from '@/helpers/apollo';
import { VOTES_QUERY } from '@/helpers/queries';
import { useWeb3 } from '@/composables/useWeb3';

const voted: Ref<string[]> = ref([]);

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
    voted.value = data.votes.map(vote => `${vote.space}/${vote.proposal}`);
  }

  return { loadVotes, voted };
}
