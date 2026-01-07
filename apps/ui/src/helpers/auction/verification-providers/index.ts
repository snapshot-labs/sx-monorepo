import { ComputedRef } from 'vue';
import { VerificationStatus } from '../types';
import { sumsubProvider } from './sumsub';
import { zkpassportProvider } from './zkpassport';

export type VerificationProvider = {
  id: string;
  name: string;
  signer: string;
  startVerification: (context: VerificationContext) => Promise<void>;
};

export type VerificationContext = {
  web3Account: ComputedRef<string>;
  network: string;
  devMode: boolean;
  status: { value: VerificationStatus };
  verificationUrl: { value: string | null };
  error: { value: string | null };
  handleError: (err: unknown, message?: string) => void;
  checkWalletConnected: () => boolean;
  rpcCall: <T>(method: string, params: object) => Promise<T>;
  uiStore: any;
};

const PROVIDERS: VerificationProvider[] = [zkpassportProvider, sumsubProvider];

export type ProviderId = (typeof PROVIDERS)[number]['id'];

export function getProvider(id: string): VerificationProvider | undefined {
  return PROVIDERS.find(p => p.id === id);
}

export function getProviderBySigner(
  signer: string
): VerificationProvider | undefined {
  const normalized = `0x${signer.slice(-40)}`.toLowerCase();
  return PROVIDERS.find(p => p.signer === normalized);
}

export const VERIFICATION_PROVIDER_CONFIG = PROVIDERS.reduce(
  (acc, provider) => {
    acc[provider.id] = {
      name: provider.name,
      signer: provider.signer
    };
    return acc;
  },
  {} as Record<string, { name: string; signer: string }>
);
