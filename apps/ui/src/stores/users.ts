import { Ref, toRef } from 'vue';
import { defineStore } from 'pinia';
import { currentNetwork } from '@/networks';
import type { User } from '@/types';

type UserRecord = {
  loading: boolean;
  loaded: boolean;
  user: User | null;
};

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

      record.value.user = await currentNetwork.api.loadUser(userId);
      record.value.loaded = true;
      record.value.loading = false;
    }
  }
});
