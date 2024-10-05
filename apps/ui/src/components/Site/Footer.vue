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
              <a href="https://snapshot.org/#/setup?step=0" target="_blank">
                Create a space
                <IH-arrow-sm-right class="inline-block -rotate-45" />
              </a>
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
              <a href="https://help.snapshot.box" target="_blank">
                Helpdesk <IH-arrow-sm-right class="inline-block -rotate-45" />
              </a>
            </div>
            <div>
              <a href="https://snapshot.mirror.xyz" target="_blank">
                Blog
                <IH-arrow-sm-right class="inline-block -rotate-45" />
              </a>
            </div>
            <div>
              <a href="https://github.com/snapshot-labs/brand" target="_blank">
                Brand
                <IH-arrow-sm-right class="inline-block -rotate-45" />
              </a>
            </div>
          </div>
        </div>
        <div class="space-y-2">
          <div class="eyebrow">Developers</div>
          <div class="space-y-1">
            <div>
              <a href="https://docs.snapshot.org" target="_blank">
                Snapshot docs
                <IH-arrow-sm-right class="inline-block -rotate-45" />
              </a>
            </div>
            <div>
              <a href="https://docs.snapshot.box" target="_blank">
                Snapshot X docs
                <IH-arrow-sm-right class="inline-block -rotate-45" />
              </a>
            </div>
            <div>
              <a href="https://github.com/snapshot-labs" target="_blank">
                GitHub
                <IH-arrow-sm-right class="inline-block -rotate-45" />
              </a>
            </div>
            <div>
              <a href="https://status.snapshot.org" target="_blank">
                Status
                <IH-arrow-sm-right class="inline-block -rotate-45" />
              </a>
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
          <a
            :href="`https://github.com/${repository}${COMMIT_SHA && `/tree/${COMMIT_SHA}`}`"
            target="_blank"
            class="ml-1.5"
          >
            <span
              v-text="
                `v${version}${COMMIT_SHA ? `#${COMMIT_SHA.slice(0, 7)}` : ''}`
              "
            />
            <IH-arrow-sm-right class="inline-block -rotate-45 ml-0.5" />
          </a>
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
