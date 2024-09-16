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
  <div class="pt-6 pb-5 border-t">
    <UiContainer class="!max-w-screen-lg space-y-7">
      <div class="grid grid-col-2 md:grid-cols-4 space-y-4 md:space-y-0">
        <div class="space-y-2">
          <div class="eyebrow">Snapshot</div>
          <div class="space-y-1">
            <div>
              <AppLink :to="{ name: 'my-explore' }"> Explore spaces </AppLink>
            </div>
            <div>
              <AppLink to="https://snapshot.org/#/setup?step=0">
                Create a space
              </AppLink>
            </div>
            <div>
              <AppLink :to="{ name: 'site-ecosystem' }"> Ecosystem </AppLink>
            </div>
            <div>
              <AppLink :to="{ name: 'site-network' }"> Add network </AppLink>
            </div>
          </div>
        </div>
        <div class="space-y-2">
          <div class="eyebrow">Resources</div>
          <div class="space-y-1">
            <div>
              <AppLink to="https://help.snapshot.org"> Helpdesk </AppLink>
            </div>
            <div>
              <AppLink to="https://snapshot.mirror.xyz"> Blog </AppLink>
            </div>
            <div>
              <AppLink to="https://github.com/snapshot-labs/brand">
                Brand
              </AppLink>
            </div>
          </div>
        </div>
        <div class="space-y-2">
          <div class="eyebrow">Developers</div>
          <div class="space-y-1">
            <div>
              <AppLink to="https://docs.snapshot.org"> Snapshot docs </AppLink>
            </div>
            <div>
              <AppLink to="https://docs.snapshot.box">
                Snapshot X docs
              </AppLink>
            </div>
            <div>
              <AppLink to="https://github.com/snapshot-labs"> GitHub </AppLink>
            </div>
            <div>
              <AppLink to="https://status.snapshot.org"> Status </AppLink>
            </div>
          </div>
        </div>
        <div class="space-y-2">
          <div class="eyebrow">Company</div>
          <div>
            <AppLink :to="{ name: 'site-terms' }">Terms of use</AppLink>
          </div>
          <div>
            <AppLink :to="{ name: 'site-policy' }">Privacy policy</AppLink>
          </div>
          <div>
            <a class="intercom-launcher" target="_blank"> Contact us </a>
          </div>
        </div>
      </div>
      <div class="flex">
        <div class="flex-grow">
          <img
            src="@/assets/snapshot.svg"
            alt="Snapshot"
            class="w-4 inline-block mr-3"
          />
          © {{ new Date().getFullYear() }} Snapshot Labs
          <AppLink
            :to="`https://github.com/${repository}${COMMIT_SHA && `/tree/${COMMIT_SHA}`}`"
            class="ml-1.5"
          >
            {{ `v${version}${COMMIT_SHA ? `#${COMMIT_SHA.slice(0, 7)}` : ''}` }}
          </AppLink>
        </div>
        <div class="flex space-x-2.5">
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
    </UiContainer>
  </div>
</template>
