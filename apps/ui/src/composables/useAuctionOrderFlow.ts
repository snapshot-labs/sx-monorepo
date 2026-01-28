import { MaybeRefOrGetter } from 'vue';
import { AuctionNetworkId, SellOrder } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { isWethContract } from '@/helpers/token';

type StepId = 'wrap' | 'check_approval' | 'approve' | 'bid';

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

const LAST_STEP: StepId = 'bid';

export function useAuctionOrderFlow(
  networkId: MaybeRefOrGetter<AuctionNetworkId>,
  auction: MaybeRefOrGetter<AuctionDetailFragment>
) {
  const { getIsTokenApproved, wrapEth, approveToken, placeSellOrder } =
    useAuctionActions(networkId, auction);

  const initialStep = computed(() => {
    if (isWethContract(toValue(auction).addressBiddingToken)) {
      return 'wrap';
    }

    return 'check_approval';
  });

  const sellOrder = ref<SellOrder>({
    sellAmount: 0n,
    buyAmount: 0n,
    auction: toValue(auction)
  });
  const currentStepId = ref<StepId>(initialStep.value);
  const stepExecuteResults = ref<Map<StepId, boolean>>(new Map());

  const STEPS = ref<Record<StepId, Step>>({
    wrap: {
      messages: {
        approveTitle: 'Wrapping tokens',
        approveSubtitle: 'Waiting for wrapping to complete',
        failTitle: 'Unwable to wrap your tokens'
      },
      nextStep: () => 'check_approval',
      execute: async () => wrapEth(sellOrder.value)
    },
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

  function goToNextStep() {
    const nextStep = currentStep.value.nextStep();

    if (nextStep) {
      currentStepId.value = nextStep;
    }
  }

  function start(order: SellOrder) {
    currentStepId.value = initialStep.value;
    stepExecuteResults.value.clear();
    sellOrder.value = order;
  }

  return { start, goToNextStep, isLastStep, currentStep };
}
