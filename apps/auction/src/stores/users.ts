import { defineStore } from 'pinia';
import { ref } from 'vue';

export type StoredUser = {
  id: string;
  name?: string;
  avatar?: string;
};

export const useUsersStore = defineStore('users', () => {
  const users = ref<Record<string, StoredUser>>({});

  function getUser(id: string | null | undefined): StoredUser | null {
    if (!id) return null;
    return users.value[id] ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function fetchUser(_id: string) {
    return null;
  }

  return {
    users,
    getUser,
    fetchUser
  };
});
