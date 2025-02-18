import { pinPineapple } from '@/helpers/pin';
import { clone, verifyNetwork } from '@/helpers/utils';
import { ChainId } from '@/types';
import { TokenId } from './usePayment';

type StepId = 'check_balance' | 'check_approval' | 'approve' | 'pay';
type Step = {
  approveTitle: string;
  approveSubtitle: string;
  failTitle?: string;
  failSubtitle?: string;
  nextStep: () => StepId | false;
  execute: () => Promise<string | null>;
};
export type BarcodePayload = Record<string, any>;

const BARCODE_VERSION = '0.1';

const DEFAULT_FAIL_MESSAGES = {
  failTitle: '',
  failSubtitle: ''
};

export default function usePaymentFactory() {
  const { modalAccountOpen } = useModal();
  const { auth } = useWeb3();
  const uiStore = useUiStore();

  const currentStepErrorMessage = ref(clone(DEFAULT_FAIL_MESSAGES));
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
      currentStepErrorMessage.value = clone(DEFAULT_FAIL_MESSAGES);
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
      return wrapPromise(
        pay(amount, await getBarcode(barcodePayload)),
        chainId
      );
    };
  }

  return { createSteps, goToNextStep, isLastStep, currentStep };
}
