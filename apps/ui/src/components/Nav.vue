<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const menu = ref(false);

const items = {
  overview: {
    name: 'Overview'
  },
  proposals: {
    name: 'Proposals'
  },
  treasury: {
    name: 'Treasury'
  },
  settings: {
    name: 'Settings'
  }
};

const inactiveItems = computed(() =>
  Object.fromEntries(
    Object.entries(items).filter(item => item[0] !== route.name)
  )
);

function toggleMenu() {
  menu.value = !menu.value;
}
</script>
<template>
  <div v-if="items[$route.name]" class="x-block">
    <a class="px-4 py-3 border-b last:border-0 block" @click="toggleMenu">
      <h4>
        <IH-arrow-sm-up v-if="menu" class="float-right mt-1" />
        <IH-arrow-sm-down v-else class="float-right mt-1" />
        <IH-globe-alt
          v-if="$route.name === 'overview'"
          class="inline-block mr-2"
        />
        <IH-newspaper
          v-if="$route.name === 'proposals'"
          class="inline-block mr-2"
        />
        <IH-cash v-if="$route.name === 'treasury'" class="inline-block mr-2" />
        <IH-cog v-if="$route.name === 'settings'" class="inline-block mr-2" />
        {{ items[$route.name].name }}
      </h4>
    </a>
    <div v-if="menu === true">
      <router-link
        v-for="(item, i) in inactiveItems"
        :key="i"
        :to="{ name: i }"
        class="px-4 py-3 border-b last:border-0 block"
      >
        <h4>
          <IH-globe-alt v-if="i === 'overview'" class="inline-block mr-2" />
          <IH-newspaper v-if="i === 'proposals'" class="inline-block mr-2" />
          <IH-cash v-if="i === 'treasury'" class="inline-block mr-2" />
          <IH-cog v-if="i === 'settings'" class="inline-block mr-2" />
          {{ item.name }}
        </h4>
      </router-link>
    </div>
  </div>
</template>
