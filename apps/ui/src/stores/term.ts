import { defineStore } from 'pinia';
import { Space } from '@/types';
import pkg from '../../package.json';

function getCompositeSpaceId(space: Space) {
  return `${space.network}:${space.id}`;
}

export const useTermStore = defineStore('term', () => {
  const termAcceptedIds = useStorage(`${pkg.name}.term`, [] as string[]);

  function accept(space: Space) {
    termAcceptedIds.value.push(getCompositeSpaceId(space));
  }

  function isAccepted(space: Space) {
    return termAcceptedIds.value.includes(getCompositeSpaceId(space));
  }

  return {
    accept,
    isAccepted
  };
});
