import { defineStore } from 'pinia';
import apollo from '@/helpers/apollo';
import { SPACES_QUERY, SPACE_QUERY } from '@/helpers/queries';
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

      const { data } = await apollo.query({ query: SPACES_QUERY });
      this.spaces = data.spaces;
      this.loaded = true;
      this.loading = false;
    },
    async fetchSpace(id: string) {
      if (this.spacesMap.get(id)) return;

      const { data } = await apollo.query({
        query: SPACE_QUERY,
        variables: { id }
      });

      if (this.spacesMap.get(id)) return;
      this.spaces.push(data.space);
    }
  }
});
