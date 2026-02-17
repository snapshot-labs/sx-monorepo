import { ComputedRef } from 'vue';
import { AuctionNetworkId } from '../';
import { VerificationProviderId, VerificationStatus } from '../types';
import { sumsubProvider } from './sumsub';
import { zkpassportProvider } from './zkpassport';

export const PROVIDERS: Record<VerificationProviderId, VerificationProvider> = {
  zkpassport: zkpassportProvider,
  sumsub: sumsubProvider
};

export type VerificationProvider = {
  id: VerificationProviderId;
  name: string;
  startVerification: (context: VerificationContext) => Promise<void>;
};

export type VerificationContext = {
  web3Account: ComputedRef<string>;
  network: AuctionNetworkId;
  providerId: VerificationProviderId;
  status: { value: VerificationStatus };
  verificationUrl: { value: string | null };
  error: { value: string | null };
  handleError: (err: unknown, message?: string) => void;
  auth: { signature: string; timestamp: number };
  rpcCall: <T>(method: string, params: object) => Promise<T>;
  checkStatus: (options?: {
    auth?: { signature: string; timestamp: number };
    metadata?: object;
    showNotification?: boolean;
  }) => Promise<void>;
};
