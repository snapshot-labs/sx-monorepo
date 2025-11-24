import { MaybeRefOrGetter } from 'vue';
import {
  Auction,
  AUCTION_CONTRACT_ADDRESSES,
  AuctionNetworkId,
  getAuction
} from '@/helpers/auction';
import { placeSellOrder } from '@/helpers/auction/actions';
import { approve, getIsApproved } from '@/helpers/token';
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
  execute: (payload: {
    sellAmount: number;
    buyAmount?: number;
  }) => Promise<string | null>;
};

const FIRST_STEP: StepId = 'check_approval';

function getBiddingToken(auction?: Auction) {
  if (!auction) throw new Error('Missing auction details');

  return {
    contractAddress: auction.addressBiddingToken,
    decimals: Number(auction.decimalsBiddingToken),
    symbol: auction.symbolBiddingToken,
    name: auction.symbolBiddingToken
  };
}

export function useAuctionOrderFlow(
  auctionId: MaybeRefOrGetter<string>,
  networkId: MaybeRefOrGetter<AuctionNetworkId>
) {
  const { getSigner } = useNetworkSigner(networkId);
  const uiStore = useUiStore();

  const auction = ref<Auction>();
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
      execute: async payload => {
        const signer = await getSigner();
        if (!signer) return null;

        const result = await getIsApproved(
          getBiddingToken(auction.value),
          signer,
          contractAddress.value,
          payload.sellAmount
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
      execute: async payload => {
        const signer = await getSigner();
        if (!signer) return null;

        return wrapPromise(
          approve(
            getBiddingToken(auction.value),
            signer,
            contractAddress.value,
            payload.sellAmount
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
      execute: async payload => {
        if (!auction.value) throw new Error('Missing auction details');

        const signer = await getSigner();
        if (!signer) return null;

        return wrapPromise(
          placeSellOrder(
            signer,
            auction.value,
            payload.buyAmount!,
            payload.sellAmount
          )
        );
      }
    }
  });

  const contractAddress = computed<string>(
    () => AUCTION_CONTRACT_ADDRESSES[toValue(networkId)]
  );

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
    uiStore.addPendingTransaction(
      tx.hash,
      EVM_METADATA[toValue(networkId)].chainId
    );

    return tx.hash;
  }

  function start() {
    currentStepId.value = FIRST_STEP;
    stepExecuteResults.value.clear();
  }

  watchEffect(async () => {
    const auctionDetails = (
      await getAuction(toValue(auctionId), toValue(networkId))
    )?.auctionDetail;

    if (auctionDetails) {
      auction.value = {
        id: toValue(auctionId),
        network: toValue(networkId),
        ...auctionDetails
      };
    }
  });

  return { start, goToNextStep, isLastStep, currentStep };
}
