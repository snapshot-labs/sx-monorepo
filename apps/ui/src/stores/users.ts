import { defineStore } from 'pinia';
import { getNetwork, metadataNetwork } from '@/networks';
import { User } from '@/types';

type UserRecord = {
  loading: boolean;
  loaded: boolean;
  user: User | null;
};

const network = getNetwork(metadataNetwork);

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

      this.users[userId] ||= {
        loading: false,
        loaded: false,
        user: null
      };

      const record = toRef(this.users, userId) as Ref<UserRecord>;
      record.value.loading = true;

      record.value.user = await network.api.loadUser(userId);

      record.value.loaded = true;
      record.value.loading = false;
    }
  }
});
