import { defineStore } from 'pinia';
import { NetworkID } from '@/types';
import pkg from '../../package.json';

type SpaceLikeEntity = { network: NetworkID; id: string };

function getCompositeSpaceId(space: SpaceLikeEntity) {
  return `${space.network}:${space.id}`;
}

export const useTermStore = defineStore('term', () => {
  const termAcceptedIds = useStorage(`${pkg.name}.term`, [] as string[]);

  function accept(space: SpaceLikeEntity) {
    termAcceptedIds.value.push(getCompositeSpaceId(space));
  }

  function isAccepted(space: SpaceLikeEntity) {
    return termAcceptedIds.value.includes(getCompositeSpaceId(space));
  }

  return {
    accept,
    isAccepted
  };
});
