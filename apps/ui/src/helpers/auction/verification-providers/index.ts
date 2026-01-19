import { ComputedRef } from 'vue';
import { SubProviderId, VerificationStatus } from '../types';
import { sumsubProvider } from './sumsub';
import { zkpassportProvider } from './zkpassport';
import { zkpassportOrSumsubProvider } from './zkpassportOrSumsub';

export const PROVIDERS = {
  zkpassportOrSumsub: zkpassportOrSumsubProvider,
  zkpassport: zkpassportProvider,
  sumsub: sumsubProvider
} as const;

export type VerificationProvider = {
  id: keyof typeof PROVIDERS;
  name: string;
  signer: string;
  startVerification: (
    context: VerificationContext,
    subProviderId?: SubProviderId
  ) => Promise<void>;
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

export function getProviderBySigner(
  signer: string
): VerificationProvider | undefined {
  const normalized = `0x${signer.slice(-40).toLowerCase()}`;
  return Object.values(PROVIDERS).find(
    p => p.signer.toLowerCase() === normalized
  );
}
