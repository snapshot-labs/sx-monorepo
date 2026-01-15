import { ComputedRef } from 'vue';
import { VerificationStatus } from '../types';
import { sumsubProvider } from './sumsub';
import { zkpassportProvider } from './zkpassport';

export const PROVIDERS = {
  zkpassport: zkpassportProvider,
  sumsub: sumsubProvider
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export type VerificationProvider = {
  id: ProviderId;
  name: string;
  signer: string;
  startVerification: (context: VerificationContext) => Promise<void>;
};

export type VerificationContext = {
  web3Account: ComputedRef<string>;
  auctionId: string;
  network: string;
  status: { value: VerificationStatus };
  verificationUrl: { value: string | null };
  error: { value: string | null };
  allowListCallData: { value: `0x${string}` | null };
  handleError: (err: unknown, message?: string) => void;
  rpcCall: <T>(method: string, params: object) => Promise<T>;
  addNotification: (
    type: 'success' | 'warning' | 'error',
    message: string
  ) => void;
};

export function getProvider(id: ProviderId): VerificationProvider | undefined {
  return PROVIDERS[id];
}

export function getProviderBySigner(
  signer: string
): VerificationProvider | undefined {
  const normalized = `0x${signer.slice(-40).toLowerCase()}`;
  return Object.values(PROVIDERS).find(
    p => p.signer.toLowerCase() === normalized
  );
}
