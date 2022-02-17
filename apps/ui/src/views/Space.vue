<script setup>
import { useRoute } from 'vue-router';
import proposals from '@/helpers/proposals.json';

const route = useRoute();

const id = route.params.id;
</script>

<template>
  <Container class="py-6">
    <div class="text-center my-4">
      <UiAvatar
        address="0x4C7909d6F029b3a5798143C843F4f8e5341a3473"
        :size="80"
        class="mb-2"
      />
      <h1>Bolo squad</h1>
      <div><b class="text-skin-link">3</b> proposals</div>
    </div>
    <div>
      <div class="border rounded-lg mb-4">
        <router-link :to="{ name: 'create' }" class="px-4 py-3 block">
          <h4>
            <Icon name="go" class="float-right mt-1" />
            Create proposal
          </h4>
        </router-link>
      </div>
      <div class="border rounded-lg mb-4">
        <a class="px-4 py-3 block border-b">
          <h4>
            <Icon name="wallet" class="mr-2" />
            Treasury
          </h4>
        </a>
        <router-link :to="{ name: 'settings' }" class="px-4 py-3 block">
          <h4>
            <Icon name="gear mr-2" />
            Settings
          </h4>
        </router-link>
      </div>
      <Proposal
        v-for="(proposal, i) in proposals"
        :key="i"
        :proposal="proposal"
        class="block rounded-lg border mb-3"
      />
    </div>
  </Container>
</template>
