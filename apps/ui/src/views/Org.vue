<script setup>
import { useRoute } from 'vue-router';
import proposals from '@/helpers/proposals.json';

const route = useRoute();

const id = route.params.id;
</script>

<template>
  <Layout class="py-6 max-w-xl mx-auto">
    <div class="text-center my-4">
      <UiAvatar
        address="0x4C7909d6F029b3a5798143C843F4f8e5341a3473"
        :size="80"
        class="mb-2"
      />
      <h1>Pasta DAO</h1>
      <div><b class="text-skin-link">3</b> proposals</div>
    </div>
    <div class="border rounded-lg mb-4">
      <router-link
        :to="{ name: 'space', params: { id: '1' } }"
        class="px-4 py-3 border-b block"
      >
        <h4>
          Bolo squad
          <UiCounter :counter="123" class="float-right mt-1" />
        </h4>
      </router-link>
      <router-link
        :to="{ name: 'space', params: { id: '2' } }"
        class="px-4 py-3 block border-b"
      >
        <h4>
          Carbo squad
          <UiCounter :counter="45" class="float-right mt-1" />
        </h4>
      </router-link>
      <a class="px-4 py-3 block">
        <h4>
          <Icon name="plus" class="mr-2" />
          Create a space
        </h4>
      </a>
    </div>
    <Proposal
      v-for="(proposal, i) in proposals"
      :key="i"
      :proposal="proposal"
      class="block rounded-lg border mb-3"
    />
  </Layout>
</template>
