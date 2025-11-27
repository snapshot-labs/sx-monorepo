import { MaybeRefOrGetter } from 'vue';
import { AuctionNetworkId, SellOrder } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';

type StepId = 'check_approval' | 'approve' | 'bid';

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
  execute: () => Promise<string | null>;
};

const FIRST_STEP: StepId = 'check_approval';
const LAST_STEP: StepId = 'bid';

export function useAuctionOrderFlow(
  networkId: MaybeRefOrGetter<AuctionNetworkId>,
  auction: MaybeRefOrGetter<AuctionDetailFragment>
) {
  const { getIsTokenApproved, approveToken, placeSellOrder } =
    useAuctionActions(networkId, auction);

  const sellOrder = ref<SellOrder>({ sellAmount: '0', price: '0' });
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
        stepExecuteResults.value.get('check_approval') ? 'bid' : 'approve',
      execute: async () => {
        const result = await getIsTokenApproved(sellOrder.value);

        if (result === null) {
          return null;
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
      nextStep: () => 'bid',
      execute: async () => approveToken(sellOrder.value)
    },
    bid: {
      messages: {
        approveTitle: 'Confirm order',
        confirmingTitle: 'Confirming order',
        successTitle: 'Order successful'
      },
      nextStep: () => false,
      execute: async () => placeSellOrder(sellOrder.value)
    }
  });

  const currentStep = computed<Step>(() => STEPS.value[currentStepId.value]);

  const isLastStep = computed<boolean>(() => {
    return currentStepId.value === LAST_STEP;
  });

  function goToNextStep(): boolean {
    const nextStep = currentStep.value.nextStep();

    if (nextStep) {
      currentStepId.value = nextStep;
      return true;
    }

    return false;
  }

  function start(order: SellOrder) {
    currentStepId.value = FIRST_STEP;
    stepExecuteResults.value.clear();
    sellOrder.value = order;
  }

  return { start, goToNextStep, isLastStep, currentStep };
}
