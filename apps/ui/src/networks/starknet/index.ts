import { createApi } from './api';

export function createStarknetNetwork() {
  return {
    api: createApi()
  };
}
