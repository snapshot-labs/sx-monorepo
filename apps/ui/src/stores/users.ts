import { defineStore } from 'pinia';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import { getNames } from '@/helpers/stamp';
import type { User } from '@/types';

type UserRecord = {
  loading: boolean;
  loaded: boolean;
  user: User | null;
};

const networkId = offchainNetworks.filter(network => enabledNetworks.includes(network))[0];
const network = getNetwork(networkId);

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

      const user = await network.api.loadUser(userId);

      if (user) {
        user.name ||= (await getNames([userId]))[userId];
        record.value.user = user;
      }

      record.value.loaded = true;
      record.value.loading = false;
    }
  }
});
