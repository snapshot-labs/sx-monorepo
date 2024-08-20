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

const ORGS = [
  'https://cdn.stamp.fyi/space/aave.eth?s=100',
  'https://cdn.stamp.fyi/space/ens.eth?s=100',
  'https://cdn.stamp.fyi/space/safe.eth?s=100',
  'data:image/png;base64,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',
  'https://cdn.stamp.fyi/space/uniswapgovernance.eth?s=100',
  'https://cdn.stamp.fyi/space/apecoin.eth?s=100',
  'https://cdn.stamp.fyi/space/lido-snapshot.eth?s=100'
];
</script>

<template>
  <div class="!mt-[0px] relative">
    <div class="absolute top-0 left-6 right-6 py-4 flex justify-center">
      <div class="left-0 text-[26px] absolute text-skin-link">
        snapshot
      </div>
      <ul class="text-md text-skin-link flex space-x-3 mx-auto py-2">
        <li>Features</li>
        <li>Ecosystem</li>
        <li>Developers</li>
        <li>Blog</li>
        <li>FAQ</li>
      </ul>
      <div class="right-0 absolute">
        <UiButton class="primary">Launch app</UiButton>
      </div>
    </div>
    <div class="space-y-12">
      <div class="blocks">
        <UiContainer class="!max-w-[990px] h-[603px] flex items-center">
          <div class="max-w-[540px] text-center mx-auto">
            <div class="eyebrow mb-3">Turn chaos to consensus</div>
            <h1 class="mb-6 mono !text-[54px]">Where decisions get made</h1>
            <a href="https://tally.so/r/wA2D2o" target="_blank">
              <UiButton class="primary">Get started</UiButton>
            </a>
          </div>
        </UiContainer>
      </div>

      <UiContainer class="!max-w-[990px] grid grid-cols-3 gap-6 text-md">
        <div>
          <h2 class="mb-1 inline-block mono !text-[32px]">567</h2>
          <div class="text-skin-link">DAOs</div>
        </div>
        <div>
          <h2 class="mb-1 inline-block mono !text-[32px]">40,000+</h2>
          <div class="text-skin-link">Proposals</div>
        </div>
        <div>
          <h2 class="mb-1 inline-block mono !text-[32px]">32,000,000+</h2>
          <div class="text-skin-link">Votes</div>
        </div>
      </UiContainer>

      <div>
        <UiContainer class="!max-w-[990px] mb-4">
          <div class="space-y-2 text-center">
            <div class="eyebrow">Trusted by the best</div>
            <div class="text-md text-skin-link pb-3">Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.</div>
            <div class="space-x-3 flex justify-center">
              <img v-for="(org, i) in ORGS" :key="i" :src="org" class="w-[64px] h-[64px] rounded-lg"/>
            </div>
          </div>
        </UiContainer>
      </div>

      <div class="relative">
        <div class="absolute w-[602px] h-[205px] blocks top-7 right-0 border-t border-l !bg-left-top"/>
        <UiContainer class="!max-w-[990px] flex items-center">
          <div class="max-w-[440px]">
            <div class="eyebrow mb-3">Modular</div>
            <h1 class="mb-4 mono !text-[44px]">
              The governance stack for your organization
            </h1>
            <div class="text-md">
              Give autonomy to the whole team. With our drag-and-drop builder and AI-powered tools, anyone can carry out effective product research across the entire development process at scale. When you can build fast, you can learn fast.
            </div>
          </div>
        </UiContainer>
      </div>

      <div class="relative">
        <div class="absolute w-[602px] h-[205px] blocks top-7 left-0 border-t border-l !bg-right-top"/>
        <UiContainer class="!max-w-[990px] overflow-hidden">
          <div class="max-w-[440px] float-right">
            <div class="eyebrow mb-3">Frictionless</div>
            <h1 class="mb-4 mono !text-[44px]">
              The governance stack for your organization
            </h1>
            <div class="text-md">
              Give autonomy to the whole team. With our drag-and-drop builder and AI-powered tools, anyone can carry out effective product research across the entire development process at scale. When you can build fast, you can learn fast.
            </div>
          </div>
        </UiContainer>
      </div>

      <div>
        <UiContainer class="!max-w-[860px]">
          <div class="text-center pb-6 max-w-[600px] mx-auto">
            <div class="eyebrow mb-3">Features</div>
            <h1 class="mb-4 mono !text-[44px]">
              The governance stack for your organization
            </h1>
          </div>
          <div class="grid grid-cols-3 gap-7 text-md">
            <div>
              <h3 class="mb-2 flex">
                <IH-adjustments class="w-[32px] h-[32px] mr-2" />
                Modular
              </h3>
              <div>
                Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.
              </div>
            </div>
            <div>
              <h3 class="mb-2 flex">
                <IH-shield-check class="w-[32px] h-[32px] mr-2" />
                Secure
              </h3>
              <div>
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.
              </div>
            </div>
            <div>
              <h3 class="mb-2 flex">
                <IH-globe class="w-[32px] h-[32px] mr-2" />
                Open-source
              </h3>
              <div>
                Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </div>
            </div>
            <div>
              <h3 class="mb-2 flex">
                <IH-globe class="w-[32px] h-[32px] mr-2" />
                Open-source
              </h3>
              <div>
                Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </div>
            </div>
            <div>
              <h3 class="mb-2 flex">
                <IH-adjustments class="w-[32px] h-[32px] mr-2" />
                Modular
              </h3>
              <div>
                Aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.
              </div>
            </div>
            <div>
              <h3 class="mb-2 flex">
                <IH-shield-check class="w-[32px] h-[32px] mr-2" />
                Secure
              </h3>
              <div>
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.
              </div>
            </div>
          </div>
        </UiContainer>
      </div>

      <div>
        <UiContainer class="!max-w-[860px]">
          <div class="text-center max-w-[600px] mx-auto">
            <div class="eyebrow mb-3">Integrations</div>
            <h1 class="mb-4 mono !text-[44px]">
              Extend your governance with all the apps your users need
            </h1>
            <router-link to="apps">
              <UiButton class="primary">See all integrations</UiButton>
            </router-link>
          </div>
        </UiContainer>
      </div>

      <div>
        <UiContainer class="!max-w-[990px]">
          <div class="space-y-2 text-center">
            <div class="eyebrow mb-4">Backed by the best</div>
            <div class="space-x-6 flex justify-center">
              <img src="https://cdn.prod.website-files.com/65477eacd684efc9224eae35/6676f8e5485b37fe40ad9b8a_1kx.png" class="max-h-[40px] max-w-[160px] grayscale"/>
              <img src="https://images.ctfassets.net/q5ulk4bp65r7/3TBS4oVkD1ghowTqVQJlqj/2dfd4ea3b623a7c0d8deb2ff445dee9e/Consumer_Wordmark.svg" class="max-h-[40px] max-w-[160px] grayscale"/>
              <img src="https://cdn.prod.website-files.com/662931fe35e0c191d1733ab9/6630c01debf602bb95076dd6_Gnosis-Green-01.svg" class="max-h-[40px] max-w-[160px] grayscale"/>
              <img src="https://starkware.co/wp-content/uploads/2021/04/logotype.svg" class="max-h-[40px] max-w-[160px] grayscale"/>
              <img src="https://cdn.prod.website-files.com/65711f4d982d7c36ae767750/65a894759a96b4844bf049eb_LHV%20Logo-p-500.png" class="max-h-[40px] max-w-[160px] grayscale"/>
            </div>
          </div>
        </UiContainer>
      </div>

      <div class="flex items-center justify-center">
        <UiContainer class="!max-w-[860px]">
          <div class="text-center max-w-[600px] mx-auto">
            <div class="eyebrow mb-3">Get started</div>
            <h1 class="mb-4 mono !text-[44px]">
              Ready to get started?
            </h1>
            <UiButton class="primary">Create a space</UiButton>
          </div>
        </UiContainer>
      </div>

      <div>
        <UiContainer class="!max-w-[990px] space-y-7">
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

  </div>
</template>
