<script setup lang="ts">
import { repository, version } from '@/../package.json';
import ICDiscord from '~icons/c/discord';
import ICGithub from '~icons/c/github';
import ICX from '~icons/c/x';

const COMMIT_SHA = import.meta.env.VITE_COMMIT_SHA || '';

const SOCIALS = [
  {
    href: 'https://x.com/SnapshotLabs',
    icon: ICX
  },
  {
    href: 'https://discord.snapshot.org',
    icon: ICDiscord
  },
  {
    href: 'https://github.com/snapshot-labs',
    icon: ICGithub
  }
];
</script>

<template>
  <div class="blocks">
    <div class="py-8 pb-6">
      <UiContainer class="!max-w-[960px] my-6 text-center">
        <h1 class="mb-4 mono !text-[46px]">
          Turn chaos to consensus.
        </h1>
        <a href="https://tally.so/r/wA2D2o" target="_blank">
          <UiButton class="primary">
            Get started
          </UiButton>
        </a>
      </UiContainer>
    </div>
    <div class="border-b">
      <UiContainer class="!max-w-[960px] py-8 mb-4">
        <div class="space-y-2 text-center">
          <div class="eyebrow">Trusted by the best</div>
          <div class="text-md text-skin-link pb-3">Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.</div>
          <div class="space-x-3 flex justify-center">
            <img src="https://cdn.stamp.fyi/space/aave.eth?s=100" class="w-[64px] h-[64px] rounded-lg grayscale"/>
            <img src="https://cdn.stamp.fyi/space/ens.eth?s=100" class="w-[64px] h-[64px] rounded-lg grayscale"/>
            <img src="https://cdn.stamp.fyi/space/safe.eth?s=100" class="w-[64px] h-[64px] rounded-lg grayscale"/>
            <img src="https://cdn.stamp.fyi/space/uniswapgovernance.eth?s=100" class="w-[64px] h-[64px] rounded-lg grayscale"/>
            <img src="https://cdn.stamp.fyi/space/arbitrumfoundation.eth?s=100" class="w-[64px] h-[64px] rounded-lg grayscale"/>
            <img src="https://cdn.stamp.fyi/space/apecoin.eth?s=100" class="w-[64px] h-[64px] rounded-lg grayscale"/>
            <img src="https://cdn.stamp.fyi/space/lido-snapshot.eth?s=100" class="w-[64px] h-[64px] rounded-lg grayscale"/>
          </div>
        </div>
      </UiContainer>
    </div>
    <div>
      <UiContainer class="!max-w-[960px] py-8 grid grid-cols-3 gap-6 text-md">
        <div>
          <IH-adjustments class="mb-2 text-[#fbe76b] w-[32px] h-[32px]" />
          <h3 class="mb-3 inline-block">Modular</h3>
          <div class="text-skin-link">
            Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.
          </div>
        </div>
        <div>
          <IH-shield-check class="mb-2 text-[#fbe76b] w-[32px] h-[32px]" />
          <h3 class="mb-3 inline-block">Secure</h3>
          <div class="text-skin-link">
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.
          </div>
        </div>
        <div>
          <IH-globe class="mb-2 text-[#fbe76b] w-[32px] h-[32px]" />
          <h3 class="mb-3 inline-block">Open-source</h3>
          <div class="text-skin-link">
            Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </div>
        </div>
      </UiContainer>
    </div>
    <div>
      <UiContainer class="!max-w-[960px] py-8 grid grid-cols-3 gap-6 text-md">
        <div>
          <h3 class="mb-3 inline-block">25,000</h3>
          <div class="text-skin-link">Proposals</div>
        </div>
        <div>
          <h3 class="mb-3 inline-block">2,324</h3>
          <div class="text-skin-link">Votes</div>
        </div>
        <div>
          <h3 class="mb-3 inline-block">567</h3>
          <div class="text-skin-link">DAOs</div>
        </div>
      </UiContainer>
    </div>
    <div class="banner min-h-[352px] flex items-center justify-center">
      <UiContainer class="!max-w-[960px] pb-8 pt-5">
        <div class="space-y-2 text-center">
          <div class="eyebrow">Get started</div>
          <h1>Duis aute irure dolor in</h1>
        </div>
      </UiContainer>
    </div>
    <div>
      <UiContainer class="!max-w-[960px] space-y-7 pt-8">
        <div class="grid grid-cols-4">
          <div class="space-y-2">
            <div class="eyebrow">Learn more</div>
            <div class="space-y-1">
              <div>
                <a href="https://docs.snapshot.box" target="_blank">
                  Documentation
                  <IH-arrow-sm-right class="inline-block -rotate-45" />
                </a>
              </div>
              <div>
                <a href="https://github.com/snapshot-labs/sx-evm" target="_blank">
                  Core contracts
                  <IH-arrow-sm-right class="inline-block -rotate-45" />
                </a>
              </div>
            </div>
          </div>
          <div class="space-y-2">
            <div class="eyebrow">Resources</div>
            <div class="space-y-1">
              <div>
                <a
                  href="https://help.snapshot.org"
                  target="_blank"
                >
                  Helpdesk <IH-arrow-sm-right class="inline-block -rotate-45" />
                </a>
              </div>
              <div>
                <a
                  href="https://docs.snapshot.box/protocol-sx-evm/audits"
                  target="_blank"
                >
                  Audits <IH-arrow-sm-right class="inline-block -rotate-45" />
                </a>
              </div>
              <div>
                <a href="https://docs.snapshot.box/services/sx.js" target="_blank">
                  SX.js <IH-arrow-sm-right class="inline-block -rotate-45" />
                </a>
              </div>
              <div>
                <a
                  :href="`https://github.com/${repository}${COMMIT_SHA && `/tree/${COMMIT_SHA}`}`"
                  target="_blank"
                >
                  Version {{ version
                  }}<span v-if="COMMIT_SHA" v-text="`#${COMMIT_SHA.slice(0, 7)}`" />
                  <IH-arrow-sm-right class="inline-block -rotate-45" />
                </a>
              </div>
            </div>
          </div>
          <div class="space-y-2 col-span-2 text-right">
            <div class="eyebrow">Join the community</div>
            <div class="flex space-x-2.5 float-right">
              <a
                v-for="social in SOCIALS"
                :key="social.href"
                :href="social.href"
                target="_blank"
                class="text-[#606060] hover:text-skin-link"
              >
                <component :is="social.icon" class="size-[32px] text-skin-link" />
              </a>
            </div>
          </div>
        </div>
        <div>© {{ new Date().getFullYear() }} Snapshot Labs</div>
      </UiContainer>
    </div>
  </div>
</template>
