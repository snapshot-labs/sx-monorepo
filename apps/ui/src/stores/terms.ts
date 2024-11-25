import { defineStore } from 'pinia';
import { NetworkID } from '@/types';
import pkg from '../../package.json';

type SpaceLikeEntity = { network: NetworkID; id: string };

function getCompositeSpaceId(space: SpaceLikeEntity) {
  return `${space.network}:${space.id}`;
}

export const useTermsStore = defineStore('terms', () => {
  const termsAcceptedIds = useStorage(`${pkg.name}.terms`, [] as string[]);

  function accept(space: SpaceLikeEntity) {
    termsAcceptedIds.value.push(getCompositeSpaceId(space));
  }

  function areAccepted(space: SpaceLikeEntity) {
    return termsAcceptedIds.value.includes(getCompositeSpaceId(space));
  }

  return {
    accept,
    areAccepted
  };
});
