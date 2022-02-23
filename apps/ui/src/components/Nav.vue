<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const menu = ref(false);

const items = {
  proposals: {
    name: 'Proposals',
    icon: 'receipt-outlined'
  },
  treasury: {
    name: 'Treasury',
    icon: 'wallet'
  },
  settings: {
    name: 'Settings',
    icon: 'gear'
  }
};

const inactiveItems = computed(() => {
  return Object.fromEntries(
    Object.entries(items).filter(item => item[0] !== route.name)
  );
});

function toggleMenu() {
  menu.value = !menu.value;
}
</script>
<template>
  <div class="border rounded-lg mb-3">
    <a @click="toggleMenu" class="px-4 py-3 border-b last:border-0 block">
      <h4>
        <Icon name="arrow-down" class="float-right mt-1" />
        <Icon :name="items[$route.name].icon" class="mr-2" />
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
          <Icon :name="item.icon" class="mr-2" />
          {{ item.name }}
        </h4>
      </router-link>
    </div>
  </div>
</template>
