import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';
import { enabledNetworks, getNetwork } from '@/networks';
import type { Space, NetworkID } from '@/types';
import pkg from '../../package.json';

const SPACES_LIMIT = 1000;

type NetworkRecord = {
  spaces: Record<string, Space>;
  spacesIdsList: string[];
  hasMoreSpaces: boolean;
};

export const useSpacesStore = defineStore('spaces', {
  state: () => ({
    loading: false,
    loadingMore: false,
    loaded: false,
    networksMap: Object.fromEntries(
      enabledNetworks.map(network => [
        network,
        {
          spaces: {},
          spacesIdsList: [],
          hasMoreSpaces: true
        } as NetworkRecord
      ])
    ),
    starredSpacesIds: useStorage(`${pkg.name}.spaces-starred`, [] as string[])
  }),
  getters: {
    spaces: state =>
      Object.values(state.networksMap).flatMap(record =>
        record.spacesIdsList.map(spaceId => record.spaces[spaceId])
      ),
    spacesMap: state =>
      new Map(
        Object.values(state.networksMap).flatMap(record =>
          Object.values(record.spaces).map(space => [`${space.network}:${space.id}`, space])
        )
      ),
    hasMoreSpaces: state =>
      Object.values(state.networksMap).some(record => record.hasMoreSpaces === true)
  },
  actions: {
    async _fetchSpaces(overwrite: boolean) {
      const results = await Promise.all(
        enabledNetworks.map(async id => {
          const network = getNetwork(id);

          const record = this.networksMap[id];
          if (!record.hasMoreSpaces) {
            return {
              id,
              spaces: [],
              hasMoreSpaces: false
            };
          }

          const spaces = await network.api.loadSpaces({
            skip: overwrite ? 0 : record.spacesIdsList.length,
            limit: SPACES_LIMIT
          });

          return {
            id,
            spaces,
            hasMoreSpaces: spaces.length === SPACES_LIMIT
          };
        })
      );

      this.networksMap = Object.fromEntries(
        results.map(result => {
          const spacesIds = result.spaces.map(space => space.id);

          return [
            result.id,
            {
              spacesIdsList: overwrite
                ? spacesIds
                : [...this.networksMap[result.id].spacesIdsList, ...spacesIds],
              spaces: {
                ...this.networksMap[result.id].spaces,
                ...Object.fromEntries(result.spaces.map(space => [space.id, space]))
              },
              hasMoreSpaces: result.hasMoreSpaces
            }
          ];
        })
      ) as Record<NetworkID, NetworkRecord>;
    },
    async fetch() {
      if (this.loading || this.loaded) return;
      this.loading = true;

      await this._fetchSpaces(true);

      this.loaded = true;
      this.loading = false;
    },
    async fetchMore() {
      if (this.loading || !this.loaded) return;
      this.loadingMore = true;

      await this._fetchSpaces(false);

      this.loadingMore = false;
    },
    async fetchSpace(spaceId: string, networkId: NetworkID) {
      const network = getNetwork(networkId);

      const space = await network.api.loadSpace(spaceId);

      this.networksMap[networkId].spaces = {
        ...this.networksMap[networkId].spaces,
        [spaceId]: space
      };
    },
    toggleSpaceStar(id: string) {
      if (this.starredSpacesIds.includes(id)) {
        this.starredSpacesIds = this.starredSpacesIds.filter((spaceId: string) => spaceId !== id);
      } else {
        this.starredSpacesIds.unshift(id);
      }
    }
  }
});
