<script setup lang="ts">
import { version, repository } from '@/../package.json';
import ICX from '~icons/c/x';
import ICDiscord from '~icons/c/discord';
import ICGithub from '~icons/c/github';

const COMMIT_SHA = import.meta.env.VITE_COMMIT_SHA || '';

const SOCIALS = [
  {
    href: 'https://twitter.com/SnapshotLabs',
    icon: ICX
  },
  {
    href: 'https://discord.gg/snapshot',
    icon: ICDiscord
  },
  {
    href: 'https://github.com/snapshot-labs',
    icon: ICGithub
  }
];
</script>

<template>
  <div>
    <div class="py-8 mb-6 border-b hero">
      <UiContainer class="!max-w-screen-md my-1">
        <h1 class="mb-4 mono max-w-[580px]">The governance stack for your organization.</h1>
        <a href="https://tally.so/r/wA2D2o" target="_blank">
          <UiButton class="primary">
            Sign up for beta
            <IH-arrow-sm-right class="inline-block -rotate-45" />
          </UiButton>
        </a>
      </UiContainer>
    </div>
    <UiContainer class="!max-w-screen-md space-y-4">
      <div class="space-y-2">
        <div class="eyebrow">Learn more</div>
        <div class="space-y-2">
          <div>
            <a href="https://docs.snapshotx.xyz" target="_blank">
              Documentation <IH-arrow-sm-right class="inline-block -rotate-45" />
            </a>
          </div>
          <div>
            <a href="https://github.com/snapshot-labs/sx-evm" target="_blank">
              Core contracts <IH-arrow-sm-right class="inline-block -rotate-45" />
            </a>
          </div>
          <div>
            <a href="https://docs.snapshotx.xyz/protocol-sx-evm/audits" target="_blank">
              Audits <IH-arrow-sm-right class="inline-block -rotate-45" />
            </a>
          </div>
          <div>
            <a href="https://docs.snapshotx.xyz/services/sx.js" target="_blank">
              SX.js <IH-arrow-sm-right class="inline-block -rotate-45" />
            </a>
          </div>
          <div>
            <a
              :href="`https://github.com/${repository}${COMMIT_SHA && `/tree/${COMMIT_SHA}`}`"
              target="_blank"
            >
              Version {{ version }}<span v-if="COMMIT_SHA" v-text="`#${COMMIT_SHA.slice(0, 7)}`" />
              <IH-arrow-sm-right class="inline-block -rotate-45" />
            </a>
          </div>
        </div>
      </div>
      <div class="space-y-2">
        <div class="eyebrow">Join the community</div>
        <div class="flex space-x-2">
          <a
            v-for="social in SOCIALS"
            :key="social.href"
            :href="social.href"
            target="_blank"
            class="text-[#606060] hover:text-skin-link"
          >
            <component :is="social.icon" class="w-[32px] h-[32px]" />
          </a>
        </div>
      </div>
      <div>© {{ new Date().getFullYear() }} Snapshot Labs</div>
    </UiContainer>
  </div>
</template>
