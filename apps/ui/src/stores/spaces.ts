import { defineStore } from 'pinia';
import { currentNetwork } from '@/networks';
import type { Space } from '@/types';

export const useSpacesStore = defineStore('spaces', {
  state: () => ({
    loading: false,
    loaded: false,
    spaces: [] as Space[]
  }),
  getters: {
    spacesMap: state => new Map(state.spaces.map(space => [space.id, space]))
  },
  actions: {
    async fetchAll() {
      if (this.loading) return;
      this.loading = true;

      this.spaces = await currentNetwork.api.loadSpaces();
      this.loaded = true;
      this.loading = false;
    },
    async fetchSpace(id: string) {
      if (this.spacesMap.get(id)) return;

      const space = await currentNetwork.api.loadSpace(id);

      if (this.spacesMap.get(id)) return;
      this.spaces.push(space);
    }
  }
});
