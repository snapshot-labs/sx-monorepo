<script setup lang="ts">
import { formatUnits } from '@ethersproject/units';
import { AuctionNetworkId } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { getGenericExplorerUrl } from '@/helpers/generic';
import { _n, _p } from '@/helpers/utils';
import { METADATA as EVM_METADATA } from '@/networks/evm';

const props = defineProps<{
  network: AuctionNetworkId;
  auction: AuctionDetailFragment;
  totalSupply: bigint;
  biddingTokenPrice?: number;
}>();

const chainId = computed(() => EVM_METADATA[props.network].chainId);
const networkName = computed(() => EVM_METADATA[props.network].name);
</script>

<template>
  <div>
    <div class="flex px-4 space-x-3 bg-skin-bg border-b">
      <UiLabel :is-active="true" text="Auction details" size="lg" />
    </div>
    <div class="border-b">
      <div class="p-4 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
        <div class="flex flex-col">
          <span>Network</span>
          <span class="text-skin-link" v-text="networkName" />
        </div>
        <div class="flex flex-col">
          <span>Token for sale</span>
          <a
            :href="
              getGenericExplorerUrl(
                chainId,
                auction.addressAuctioningToken,
                'token'
              ) || '#'
            "
            target="_blank"
            class="flex items-center gap-1 text-skin-link"
          >
            {{ auction.symbolAuctioningToken }}
            <IH-arrow-sm-right class="-rotate-45" />
          </a>
        </div>
        <div class="flex flex-col">
          <span>Payment token</span>
          <a
            :href="
              getGenericExplorerUrl(
                chainId,
                auction.addressBiddingToken,
                'token'
              ) || '#'
            "
            target="_blank"
            class="flex items-center gap-1 text-skin-link"
          >
            {{ auction.symbolBiddingToken }}
            <IH-arrow-sm-right class="-rotate-45" />
          </a>
        </div>
        <div class="flex flex-col">
          <span>Tokens for sale</span>
          <span class="text-skin-link">
            {{
              _n(
                formatUnits(
                  auction.exactOrder.sellAmount,
                  auction.decimalsAuctioningToken
                )
              )
            }}
            {{ auction.symbolAuctioningToken }}
          </span>
        </div>
        <div class="flex flex-col">
          <span>Supply for sale</span>
          <span class="text-skin-link">
            {{
              _p(
                totalSupply > 0n
                  ? Number(
                      (BigInt(auction.exactOrder.sellAmount) * 10000n) /
                        totalSupply
                    ) / 10000
                  : 0
              )
            }}
          </span>
        </div>
        <div class="flex flex-col">
          <span>Min. bid amount</span>
          <div>
            <span class="text-skin-link">
              {{
                _n(
                  formatUnits(
                    auction.minimumBiddingAmountPerOrder,
                    auction.decimalsBiddingToken
                  )
                )
              }}
              {{ auction.symbolBiddingToken }}
            </span>
            <span v-if="biddingTokenPrice" class="text-skin-text text-[17px]">
              ${{
                _n(
                  Number(
                    formatUnits(
                      auction.minimumBiddingAmountPerOrder,
                      auction.decimalsBiddingToken
                    )
                  ) * biddingTokenPrice,
                  'standard',
                  { maximumFractionDigits: 2 }
                )
              }}
            </span>
          </div>
        </div>
        <div class="flex flex-col">
          <span>Min. token price</span>
          <div>
            <span class="text-skin-link">
              {{ _n(auction.exactOrder.price) }}
              {{ auction.symbolBiddingToken }}
            </span>
            <span v-if="biddingTokenPrice" class="text-skin-text text-[17px]">
              ${{
                _n(
                  Number(auction.exactOrder.price) * biddingTokenPrice,
                  'standard',
                  { maximumFractionDigits: 2 }
                )
              }}
            </span>
          </div>
        </div>
        <div class="flex flex-col">
          <span>Min. funding</span>
          <div>
            <span class="text-skin-link">
              {{
                _n(
                  formatUnits(
                    auction.minFundingThreshold,
                    auction.decimalsBiddingToken
                  )
                )
              }}
              {{ auction.symbolBiddingToken }}
            </span>
            <span v-if="biddingTokenPrice" class="text-skin-text text-[17px]">
              ${{
                _n(
                  Number(
                    formatUnits(
                      auction.minFundingThreshold,
                      auction.decimalsBiddingToken
                    )
                  ) * biddingTokenPrice,
                  'standard',
                  { maximumFractionDigits: 2 }
                )
              }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
