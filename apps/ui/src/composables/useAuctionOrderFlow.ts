import { MaybeRefOrGetter } from 'vue';
import {
  AUCTION_CONTRACT_ADDRESSES,
  AuctionNetworkId,
  SellOrder
} from '@/helpers/auction';
import { placeSellOrder } from '@/helpers/auction/actions';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { approve, getIsApproved, Token } from '@/helpers/token';
import { verifyNetwork } from '@/helpers/utils';
import { METADATA as EVM_METADATA } from '@/networks/evm';

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

function getBiddingToken(auction: AuctionDetailFragment): Token {
  return {
    contractAddress: auction.addressBiddingToken,
    decimals: Number(auction.decimalsBiddingToken),
    symbol: auction.symbolBiddingToken
  };
}

export function useAuctionOrderFlow(
  networkId: MaybeRefOrGetter<AuctionNetworkId>,
  auction: MaybeRefOrGetter<AuctionDetailFragment>
) {
  const uiStore = useUiStore();
  const { auth } = useWeb3();
  const { modalAccountOpen } = useModal();

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
        if (!auth.value) {
          modalAccountOpen.value = true;
          return null;
        }

        await verifyNetwork(auth.value.provider, chainId.value);

        const result = await getIsApproved(
          getBiddingToken(toValue(auction)),
          auth.value.provider,
          contractAddress.value,
          sellOrder.value.sellAmount
        );

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
      execute: async () => {
        if (!auth.value) {
          modalAccountOpen.value = true;
          return null;
        }

        await verifyNetwork(auth.value.provider, chainId.value);

        return wrapPromise(
          approve(
            getBiddingToken(toValue(auction)),
            auth.value.provider,
            contractAddress.value,
            sellOrder.value.sellAmount
          )
        );
      }
    },
    bid: {
      messages: {
        approveTitle: 'Confirm order',
        confirmingTitle: 'Confirming order',
        successTitle: 'Order successful'
      },
      nextStep: () => false,
      execute: async () => {
        if (!auth.value) {
          modalAccountOpen.value = true;
          return null;
        }

        await verifyNetwork(auth.value.provider, chainId.value);

        return wrapPromise(
          placeSellOrder(
            auth.value.provider,
            toValue(auction),
            toValue(networkId),
            sellOrder.value
          )
        );
      }
    }
  });

  const contractAddress = computed<string>(
    () => AUCTION_CONTRACT_ADDRESSES[toValue(networkId)]
  );

  const chainId = computed<number>(() => {
    return EVM_METADATA[toValue(networkId)].chainId;
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

  async function wrapPromise(promise: Promise<any>): Promise<string> {
    const tx = await promise;
    uiStore.addPendingTransaction(tx.hash, chainId.value);

    return tx.hash;
  }

  function start(order: SellOrder) {
    currentStepId.value = FIRST_STEP;
    stepExecuteResults.value.clear();
    sellOrder.value = order;
  }

  return { start, goToNextStep, isLastStep, currentStep };
}
