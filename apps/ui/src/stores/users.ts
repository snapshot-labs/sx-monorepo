import { defineStore } from 'pinia';
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
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
    async fetchUser(userId: string, force = false) {
      if (this.getUser(userId) && !force) return;

      this.users[userId] = {
        loading: false,
        loaded: false,
        user: null
      };

      const record = toRef(this.users, userId) as Ref<UserRecord>;
      record.value.loading = false;

      record.value.user = await network.api.loadUser(userId);

      record.value.loaded = true;
      record.value.loading = false;
    }
  }
});
