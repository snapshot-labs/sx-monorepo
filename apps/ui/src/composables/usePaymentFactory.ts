import { MaybeRefOrGetter } from 'vue';
import { pinPineapple } from '@/helpers/pin';
import { ChainId } from '@/types';
import { Token } from './usePayment';

export type BarcodePayload = {
  type: string;
  ref: string | undefined;
  params: Record<string, any>;
};

type StepId = 'check_approval' | 'approve' | 'pay';

type Step = {
  messages: {
    approveTitle: string;
    approveSubtitle?: string;
    confirmingTitle?: string;
    confirmingSubtitle?: string;
    successTitle?: string;
    failTitle?: string;
    failSubtitle?: string;
  };
  nextStep: () => StepId | false;
  execute: (
    token: Token,
    amount: number,
    payload?: BarcodePayload
  ) => Promise<string | null>;
};

const BARCODE_VERSION = '0.1';

const FIRST_STEP: StepId = 'check_approval';

async function getBarcode(contents: BarcodePayload): Promise<string> {
  const receipt = await pinPineapple({
    version: BARCODE_VERSION,
    ...contents
  });

  return `ipfs://${receipt.cid}`;
}

export default function usePaymentFactory(network: MaybeRefOrGetter<ChainId>) {
  const uiStore = useUiStore();

  const { getIsApproved, approve, pay } = usePayment(network);
  const currentStepId = ref<StepId>(FIRST_STEP);
  const stepExecuteResults = ref<Map<StepId, boolean>>(new Map());

  const STEPS = ref<Record<StepId, Step>>({
    check_approval: {
      messages: {
        approveTitle: 'Checking token allowance',
        approveSubtitle: 'Please wait...',
        failTitle: 'Unable to check token allowance'
      },
      nextStep: () =>
        stepExecuteResults.value.get('check_approval') ? 'pay' : 'approve',
      execute: async (token, amount) => {
        const result = await getIsApproved(token, amount);

        if (result === undefined) {
          throw new Error('wallet not found');
        }

        stepExecuteResults.value.set('check_approval', result);

        return null;
      }
    },
    approve: {
      messages: {
        approveTitle: 'Setting token allowance',
        confirmingTitle: 'Waiting for token allowance'
      },
      nextStep: () => 'check_approval',
      execute: async (token, amount) =>
        wrapPromise(approve(token, amount), toValue(network))
    },
    pay: {
      messages: {
        approveTitle: 'Confirm payment',
        confirmingTitle: 'Confirming payment',
        successTitle: 'Payment successful'
      },
      nextStep: () => false,
      execute: async (token, amount, payload) => {
        if (!payload) {
          throw new Error('barcode payload is missing');
        }

        return wrapPromise(
          pay(token, amount, await getBarcode(payload)),
          toValue(network)
        );
      }
    }
  });

  const currentStep = computed<Step>(() => STEPS.value[currentStepId.value]);

  const isLastStep = computed<boolean>(() => {
    return currentStepId.value === Object.keys(STEPS.value).pop();
  });

  function goToNextStep(): boolean {
    const nextStep = currentStep.value.nextStep();

    if (nextStep) {
      currentStepId.value = nextStep;
      return true;
    }

    return false;
  }

  async function wrapPromise(
    promise: Promise<any>,
    chainId: ChainId
  ): Promise<string> {
    const tx = await promise;
    uiStore.addPendingTransaction(tx.hash, chainId);

    return tx.hash;
  }

  function start() {
    currentStepId.value = FIRST_STEP;
    stepExecuteResults.value.clear();
  }

  return { start, goToNextStep, isLastStep, currentStep };
}
