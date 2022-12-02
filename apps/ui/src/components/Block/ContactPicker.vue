<script setup lang="ts">
import { computed } from 'vue';
import { useAccount } from '@/composables/useAccount';
import { shorten } from '@/helpers/utils';

const CONTACTS = [
  {
    name: 'Sekhmet',
    address: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'
  },
  {
    name: 'Definitely not Sekhmet',
    address: '0x537f1896541d28F4c70116EEa602b1B34Da95163'
  },
  {
    name: 'WETH',
    address: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6'
  }
];

const props = defineProps<{
  searchValue: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'pick', value: string);
}>();

const { account } = useAccount();

const allContacts = computed(() => {
  if (!account) return CONTACTS;

  return [
    {
      name: 'You',
      address: account
    },
    ...CONTACTS
  ];
});

const filteredContacts = computed(() =>
  allContacts.value.filter(contact => {
    return (
      contact.name.toLocaleLowerCase().includes(props.searchValue.toLocaleLowerCase()) ||
      contact.address.toLocaleLowerCase() === props.searchValue.toLocaleLowerCase()
    );
  })
);
</script>

<template>
  <div v-if="loading" class="px-4 py-3 block flex justify-center">
    <UiLoading />
  </div>
  <template v-else>
    <div v-if="filteredContacts.length === 0" class="text-center py-3" v-text="'No results'" />
    <div
      v-for="contact in filteredContacts"
      :key="contact.address"
      role="button"
      class="px-3 py-[12px] border-b last:border-0 flex justify-between"
      @click="emit('pick', contact.address)"
    >
      <div class="flex items-center max-w-full">
        <Stamp :id="contact.address" type="avatar" :size="32" />
        <div class="flex flex-col ml-3 leading-[20px] overflow-hidden">
          <div class="text-skin-link" v-text="shorten(contact.name, 24)" />
          <div class="text-sm text-ellipsis overflow-hidden" v-text="contact.address" />
        </div>
      </div>
    </div>
  </template>
</template>
