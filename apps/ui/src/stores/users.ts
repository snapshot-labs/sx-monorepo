import { defineStore } from 'pinia';
import { enabledNetworks as enabledNetworkIds, getNetwork } from '@/networks';
import { getNames } from '@/helpers/stamp';
import type { User } from '@/types';

type UserWithName = User & { name?: string };

type UserRecord = {
  loading: boolean;
  loaded: boolean;
  user: UserWithName | null;
};

const enabledNetworks = enabledNetworkIds.map(network => getNetwork(network));

export const useUsersStore = defineStore('users', {
  state: () => ({
    users: {} as Record<string, UserRecord | undefined>
  }),
  getters: {
    getUser: state => {
      return (userId: string) => {
        return state.users[userId]?.user ?? null;
      };
    }
  },
  actions: {
    async fetchUser(userId: string) {
      if (this.getUser(userId)) return;

      this.users[userId] = {
        loading: false,
        loaded: false,
        user: null
      };

      const record = toRef(this.users, userId) as Ref<UserRecord>;
      record.value.loading = false;

      const users = (
        await Promise.allSettled(enabledNetworks.map(network => network.api.loadUser(userId)))
      )
        .map(result => (result.status === 'fulfilled' ? result.value : null))
        .filter(Boolean) as UserWithName[];

      record.value.user = users.reduce(
        (acc, user) => {
          acc.vote_count += user.vote_count;
          acc.proposal_count += user.proposal_count;

          const minCreated = [acc.created, user.created].filter(Number);
          if (minCreated.length) {
            acc.created = Math.min(...minCreated);
          }

          return acc;
        },
        {
          id: userId,
          name: (await getNames([userId]))[userId],
          vote_count: 0,
          proposal_count: 0,
          created: 0
        }
      );
      record.value.loaded = true;
      record.value.loading = false;
    }
  }
});
