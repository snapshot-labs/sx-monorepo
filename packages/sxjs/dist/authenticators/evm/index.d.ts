import type { Authenticator } from '../../clients/evm/types';
import type { EvmNetworkConfig } from '../../types';
export declare function getAuthenticator(address: string, networkConfig: EvmNetworkConfig): Authenticator | null;
