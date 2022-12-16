import { createActions } from './actions';
import { createApi } from './api';

export function createStarknetNetwork() {
  return {
    actions: createActions(),
    api: createApi()
  };
}
