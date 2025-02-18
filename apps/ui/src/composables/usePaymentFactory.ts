import { pinPineapple } from '@/helpers/pin';
import { verifyNetwork } from '@/helpers/utils';
import { ChainId } from '@/types';
import { TokenId } from './usePayment';

type StepId = 'check_balance' | 'check_approval' | 'approve' | 'pay';
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
  execute?: () => Promise<string | null>;
};
export type BarcodePayload = Record<string, any>;

const BARCODE_VERSION = '0.1';

export default function usePaymentFactory() {
  const { modalAccountOpen } = useModal();
  const { auth } = useWeb3();
  const uiStore = useUiStore();

  const currentStepMessages = ref({});
  const currentStepId = ref<StepId>('check_balance');
  const stepExecuteResults = ref<Map<StepId, boolean>>(new Map());
  const steps = ref<Record<StepId, Step>>({
    check_balance: {
      messages: {
        approveTitle: 'Checking balance',
        approveSubtitle: 'Verifying that your wallet has enough funds...'
      },
      nextStep: () => 'check_approval'
    },
    check_approval: {
      messages: {
        approveTitle: 'Checking token allowance',
        approveSubtitle: 'Please wait...'
      },
      nextStep: () =>
        stepExecuteResults.value.get('check_approval') ? 'pay' : 'approve'
    },
    approve: {
      messages: {
        approveTitle: 'Setting token allowance',
        confirmingTitle: 'Waiting for token allowance'
      },
      nextStep: () => 'check_approval'
    },
    pay: {
      messages: {
        approveTitle: 'Confirm payment',
        confirmingTitle: 'Confirming payment',
        successTitle: 'Payment successful'
      },
      nextStep: () => false
    }
  });

  const currentStep = computed<Step>(() => {
    return {
      ...steps.value[currentStepId.value],
      messages: {
        ...steps.value[currentStepId.value].messages,
        ...currentStepMessages.value
      }
    };
  });

  function goToNextStep(): boolean {
    const nextStep = currentStep.value.nextStep();

    if (nextStep) {
      currentStepMessages.value = {};
      currentStepId.value = nextStep;
      return true;
    }

    return false;
  }

  async function getBarcode(contents: BarcodePayload): Promise<string> {
    const receipt = await pinPineapple({
      version: BARCODE_VERSION,
      ...contents
    });

    return receipt.cid;
  }

  async function wrapPromise(
    promise: Promise<any>,
    chainId: ChainId
  ): Promise<string> {
    try {
      const tx = await promise;
      uiStore.addPendingTransaction(tx.hash, chainId);

      return tx.hash;
    } catch (e) {
      if (e.code === 'ACTION_REJECTED') {
        currentStepMessages.value = {
          failTitle: 'Transaction cancelled',
          failSubtitle: ' '
        };
      }
      throw e;
    }
  }

  const isLastStep = computed(() => {
    return currentStepId.value === Object.keys(steps.value).pop();
  });

  function reset() {
    currentStepId.value = 'check_balance';
    stepExecuteResults.value.clear();
    currentStepMessages.value = {};
  }

  async function createSteps({
    chainId,
    tokenId,
    amount,
    barcodePayload
  }: {
    chainId: ChainId;
    tokenId: TokenId;
    amount: number;
    barcodePayload: BarcodePayload;
  }) {
    if (!auth.value) {
      modalAccountOpen.value = true;
      return;
    }

    // TODO: Handle error when network is not supported by the wallet
    await verifyNetwork(auth.value.provider, Number(chainId));

    const asset = TOKENS[chainId][tokenId];
    const { hasBalance, hasApproved, approve, pay } = usePayment(
      asset,
      auth.value.provider
    );

    reset();

    steps.value.check_balance.execute = async () => {
      const result = await hasBalance(amount);

      if (!result) {
        currentStepMessages.value = {
          failTitle: 'Insufficient balance',
          failSubtitle: `You need a minimum of ${amount} ${asset.symbol} to complete this transaction`
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
      return wrapPromise(
        pay(amount, await getBarcode(barcodePayload)),
        chainId
      );
    };
  }

  return { createSteps, goToNextStep, isLastStep, currentStep };
}
