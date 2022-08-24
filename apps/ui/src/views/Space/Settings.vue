<script setup lang="ts">
import { shorten } from '@/helpers/utils';
import { AUTHS, STRATEGIES, EXECUTORS } from '@/helpers/constants';
import { Space } from '@/types';

defineProps<{ space: Space }>();
</script>

<template>
  <Container slim>
    <div class="x-block mb-3">
      <router-link
        :to="{ name: 'profile' }"
        class="px-4 py-3 border-b last:border-0 block"
      >
        <h4>
          <IH-user class="inline-block mr-2" />
          Profile
        </h4>
      </router-link>
      <router-link
        :to="{ name: 'voting' }"
        class="px-4 py-3 border-b last:border-0 block"
      >
        <h4>
          <IH-adjustments class="inline-block mr-2" />
          Voting
        </h4>
      </router-link>
    </div>

    <div class="x-block mb-3">
      <h4 class="px-4 py-3 border-b last:border-0 block">
        <IH-key class="inline-block mr-2" />
        Controller
      </h4>
      <div class="py-3 px-4">
        <a
          :href="`https://goerli.voyager.online/contract/${space.controller}`"
          target="_blank"
        >
          <Stamp
            :id="space.controller"
            type="avatar"
            :size="18"
            class="mr-2 rounded-sm"
          />
          {{ shorten(space.controller) }}
          <IH-external-link class="inline-block" />
        </a>
      </div>
    </div>

    <div class="x-block mb-3">
      <h4 class="px-4 py-3 border-b last:border-0 block">
        <IH-check-circle class="inline-block mr-2" />
        Auth(s)
      </h4>
      <div class="py-3">
        <div
          v-for="(auth, i) in space.authenticators.split(',')"
          :key="i"
          class="px-4"
        >
          <a
            :href="`https://goerli.voyager.online/contract/${auth}`"
            target="_blank"
          >
            <h4 v-text="AUTHS[auth]" />
            <Stamp
              :id="auth"
              type="avatar"
              :size="18"
              class="mr-2 rounded-sm"
            />
            {{ shorten(auth) }} <IH-external-link class="inline-block" />
          </a>
        </div>
      </div>
    </div>

    <div class="x-block mb-3">
      <h4 class="px-4 py-3 border-b last:border-0 block">
        <IH-puzzle class="inline-block mr-2" />
        Strategie(s)
      </h4>
      <div class="py-3">
        <div
          v-for="(strategy, i) in space.strategies.split(',')"
          :key="i"
          class="px-4"
        >
          <a
            :href="`https://goerli.voyager.online/contract/${strategy}`"
            target="_blank"
          >
            <h4 v-text="STRATEGIES[strategy]" />
            <Stamp
              :id="strategy"
              type="avatar"
              :size="18"
              class="mr-2 rounded-sm"
            />
            {{ shorten(strategy) }} <IH-external-link class="inline-block" />
          </a>
        </div>
      </div>
    </div>

    <div class="x-block mb-3">
      <h4 class="px-4 py-3 border-b last:border-0 block">
        <IH-code class="inline-block mr-2" />
        Execution(s)
      </h4>
      <div class="py-3">
        <div
          v-for="(executor, i) in space.executors.split(',')"
          :key="i"
          class="px-4"
        >
          <a
            :href="`https://goerli.voyager.online/contract/${executor}`"
            target="_blank"
          >
            <h4 v-text="EXECUTORS[executor]" />
            <Stamp
              :id="executor"
              type="avatar"
              :size="18"
              class="mr-2 rounded-sm"
            />
            {{ shorten(executor) }} <IH-external-link class="inline-block" />
          </a>
        </div>
      </div>
    </div>
  </Container>
</template>
