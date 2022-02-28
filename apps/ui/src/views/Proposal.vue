<script setup>
import { useRoute } from 'vue-router';
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import client from '@/helpers/client';
import { useWeb3 } from '@/composables/useWeb3';
import { useTxStatus } from '@/composables/useTxStatus';
import proposals from '@/helpers/proposals.json';

const { web3 } = useWeb3();
const auth = getInstance();
const { pendingCount } = useTxStatus();
const route = useRoute();

const id = route.params.id || 0;

async function vote(choice) {
  const envelop = await client.vote(auth.web3, web3.value.account, {
    proposal: id,
    choice
  });
  console.log('Envelop', envelop);
  pendingCount.value++;
  const receipt = await client.send(envelop);
  pendingCount.value--;
  console.log('Receipt', receipt);
}
</script>

<template>
  <Container class="pt-5">
    <h1 class="mb-3">{{ proposals[id].title }}</h1>
    <div class="flex mb-3 items-center">
      <div class="flex-auto">
        <Stamp
          id="0xeF8305E140ac520225DAf050e2f71d5fBcC543e7"
          :size="24"
          class="float-left mr-2"
        />
        <div>4:56 AM · Feb 8, 2022</div>
      </div>
      <UiButton class="!w-[46px] !h-[46px] !p-0">
        <Icon name="threedots" size="20" />
      </UiButton>
    </div>
    <div class="mb-4">
      <p>
        {{ proposals[id].body }}
      </p>
    </div>
  </Container>
  <Container slim>
    <div class="x-block mb-5">
      <Execution />
    </div>
    <div class="x-block mb-5">
      <h4 class="px-4 py-3">
        <Icon name="receipt-outlined" class="mr-2" /> Discussion
        <span class="float-right"><Icon name="external-link" /></span>
      </h4>
    </div>
  </Container>

  <Container>
    <div class="mb-4">
      <div class="grid grid-cols-3 gap-2 mb-3">
        <UiButton
          @click="vote(1)"
          class="w-full !text-white !bg-green !border-green"
        >
          <Icon name="check3" size="20" />
        </UiButton>
        <UiButton
          @click="vote(2)"
          class="w-full !text-white !bg-red !border-red"
        >
          <Icon name="close2" size="20" />
        </UiButton>
        <UiButton
          @click="vote(3)"
          class="w-full !text-white !bg-gray-500 !border-gray-500"
        >
          <Icon name="skip" size="20" />
        </UiButton>
      </div>
      <div class="mb-4">123 votes · 1h left</div>
    </div>
  </Container>
</template>
