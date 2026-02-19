<script setup lang="ts">
import { _n, autoLinkText, getSocialNetworksLink } from '@/helpers/utils';

const { setTitle } = useTitle();

const service = {
  name: 'DAObox',
  about:
    'DAObox is a full-stack DAO agency specializing in legal structuring, governance, and operational solutions.',
  avatar:
    'https://pbs.twimg.com/profile_images/1621249083217149954/jeMHCgK4_400x400.png',
  socials: getSocialNetworksLink({
    external_url: 'https://daobox.io',
    twitter: 'DAObox'
  }),
  products: [
    {
      name: 'DAO Legal Structuring',
      description:
        'Shield DAO contributors, governance, and assets with a custom DAO legal wrapper.',
      initial_price: 18500,
      price: 17500,
      price_unit: 'year'
    },
    {
      name: 'DAO Entity Management',
      description:
        "Engage DAObox to manage your DAO's legal wrappers, compliance, and daily operations.",
      initial_price: 75000,
      price: 72000,
      price_unit: 'year'
    },
    {
      name: 'Governance Representation',
      description:
        'Appoint DAObox as a neutral DAO delegate, multi-sig signer, or guardian.',
      initial_price: 39000,
      price: 36000,
      price_unit: 'year'
    },
    {
      name: 'Corporate Representation',
      description:
        'Engage DAObox as an independent director or supervisor for your DAO entity.',
      initial_price: 39000,
      price: 33000,
      price_unit: 'year'
    },
    {
      name: 'Governance & Compliance',
      description:
        'Designing governance frameworks. Drafting DAO constitutions, policies, and rules.'
    }
  ]
};

watchEffect(() => setTitle('Service'));
</script>

<template>
  <div>
    <div
      class="relative h-[156px] md:h-[140px] mb-[-86px] md:mb-[-70px] top-[-1px]"
    >
      <div class="size-full overflow-hidden">
        <SpaceCover :space="{ avatar: service.avatar }" />
      </div>
    </div>
    <div class="px-4">
      <div class="mb-4 relative">
        <img
          :src="service.avatar"
          class="size-[90px] relative mb-2 border-4 border-skin-bg !rounded-lg -left-1"
        />
        <div class="flex items-center">
          <h1 v-text="service.name" />
        </div>
        <div class="mb-3 flex flex-wrap gap-x-1 items-center">
          <div>
            <b class="text-skin-link">{{ _n(service.products.length) }}</b>
            services
          </div>
          <div>·</div>
          <div>
            <b class="text-skin-link">{{ _n(2) }}</b>
            spaces
          </div>
        </div>
        <div
          v-if="service.about"
          class="max-w-[540px] text-skin-link text-md leading-[26px] mb-3 break-words"
          v-html="autoLinkText(service.about)"
        />
        <div v-if="service.socials.length > 0" class="space-x-2 flex">
          <template v-for="social in service.socials" :key="social.key">
            <a
              :href="social.href"
              target="_blank"
              class="text-[#606060] hover:text-skin-link"
            >
              <component :is="social.icon" class="size-[26px]" />
            </a>
          </template>
        </div>
      </div>
    </div>

    <div>
      <UiLabel :label="'Services'" sticky />
      <div
        v-for="product in service.products"
        class="border-b mx-4 py-3 flex justify-between"
      >
        <div class="mb-2">
          <h3 class="text-[21px]" v-text="product.name" />
          <div
            class="leading-6 max-w-[380px] mb-1"
            v-text="product.description"
          />
        </div>
        <div class="flex flex-col items-end gap-1.5 justify-center">
          <div
            v-if="product.price"
            class="space-x-1 text-[19px] text-skin-link"
          >
            <span
              v-if="product.initial_price"
              class="line-through"
              v-text="`$${_n(product.initial_price)}`"
            />
            <b v-text="`$${_n(product.price)}`" />
            <span
              v-if="product.price_unit"
              class="text-[17px] text-skin-text"
              v-text="`/ ${product.price_unit}`"
            />
          </div>
          <a :href="'https://daobox.io/?ref=snapshot'" target="_blank">
            <UiButton primary>Subscribe</UiButton>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
