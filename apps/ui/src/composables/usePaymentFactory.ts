import { pinPineapple } from '@/helpers/pin';
import { verifyNetwork } from '@/helpers/utils';
import { ChainId } from '@/types';
import { TokenId } from './usePayment';

export type SubscriptionLength = 'monthly' | 'yearly';
type StepId = 'check_balance' | 'check_approval' | 'approve' | 'pay';
type Step = {
  approveTitle: string;
  approveSubtitle: string;
  failTitle?: string;
  failSubtitle?: string;
  nextStep: () => StepId | false;
  execute: () => Promise<string | null>;
};
type Product = 'turbo';

const BARCODE_VERSION = '0.1';

export default function usePaymentFactory() {
  const { modalAccountOpen } = useModal();
  const { auth } = useWeb3();
  const uiStore = useUiStore();

  const currentStepErrorMessage = ref({ failTitle: '', failSubtitle: '' });
  const currentStepId = ref<StepId>('check_balance');
  const stepExecuteResults = ref<Map<StepId, boolean>>(new Map());
  const steps = ref<Record<StepId, Step>>({
    check_balance: {
      approveTitle: 'Checking balance',
      approveSubtitle: 'Verifying that your wallet has enough funds...',
      nextStep: () => 'check_approval',
      execute: async () => null
    },
    check_approval: {
      approveTitle: 'Checking spending cap',
      approveSubtitle: '',
      nextStep: () =>
        stepExecuteResults.value.get('check_approval') ? 'pay' : 'approve',
      execute: async () => null
    },
    approve: {
      approveTitle: 'Approving spending cap',
      approveSubtitle: '',
      nextStep: () => 'check_approval',
      execute: async () => null
    },
    pay: {
      approveTitle: 'Confirm payment',
      approveSubtitle: 'Please sign the payment transaction',
      nextStep: () => false,
      execute: async () => null
    }
  });

  const currentStep = computed<Step>(() => {
    return {
      ...steps.value[currentStepId.value],
      ...currentStepErrorMessage.value
    };
  });

  function goToNextStep(): boolean {
    const nextStep = currentStep.value.nextStep();

    if (nextStep) {
      currentStepErrorMessage.value = { failTitle: '', failSubtitle: '' };
      currentStepId.value = nextStep;
      return true;
    }

    return false;
  }

  async function getBarcode(id: string, type: string): Promise<string> {
    const schema = {
      version: BARCODE_VERSION,
      type,
      data: {
        params: {
          id
        }
      }
    };
    const r = await pinPineapple(schema);
    console.log(r);
    return r.cid;
  }

  async function wrapPromise(
    promise: Promise<any>,
    chainId: ChainId
  ): Promise<string> {
    const tx = await promise;
    uiStore.addPendingTransaction(tx.hash, chainId);

    return tx.hash;
  }

  const isLastStep = computed(() => {
    return currentStepId.value === Object.keys(steps.value).pop();
  });

  async function createSteps({
    chainId,
    tokenId,
    amount,
    id,
    type
  }: {
    chainId: ChainId;
    tokenId: TokenId;
    amount: number;
    id: string;
    type: Product;
  }) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return;
    }
    await verifyNetwork(auth.value.provider, Number(chainId));

    const asset = TOKENS[chainId][tokenId];
    const {
      hasBalance,
      isApproved: hasApproved,
      approve,
      pay
    } = usePayment(asset, auth.value.provider);

    currentStepId.value = 'check_balance';
    stepExecuteResults.value.clear();

    steps.value.check_balance.execute = async () => {
      const result = await hasBalance(amount);

      if (!result) {
        currentStepErrorMessage.value = {
          failTitle: 'Insufficient balance',
          failSubtitle: `You need a minimum of ${amount} ${asset.symbol} to complete this action.`
        };
        throw new Error('Insufficient balance');
      }

      return null;
    };

    steps.value.check_approval.execute = async () => {
      stepExecuteResults.value.set('check_approval', await hasApproved(amount));

      return null;
    };

    steps.value.approve.execute = async () => {
      return wrapPromise(approve(amount), chainId);
    };

    steps.value.pay.execute = async () => {
      return wrapPromise(pay(amount, await getBarcode(id, type)), chainId);
    };
  }

  return { createSteps, goToNextStep, isLastStep, currentStep };
}
