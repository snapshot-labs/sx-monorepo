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
  <div class="pt-6 pb-5">
    <UiContainer class="!max-w-screen-lg space-y-7">
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
              <a href="https://help.snapshot.org" target="_blank">
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
              <a
                href="https://docs.snapshot.box/services/sx.js"
                target="_blank"
              >
                SX.js <IH-arrow-sm-right class="inline-block -rotate-45" />
              </a>
            </div>
            <div>
              <a
                :href="`https://github.com/${repository}${COMMIT_SHA && `/tree/${COMMIT_SHA}`}`"
                target="_blank"
              >
                Version {{ version
                }}<span
                  v-if="COMMIT_SHA"
                  v-text="`#${COMMIT_SHA.slice(0, 7)}`"
                />
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
</template>
